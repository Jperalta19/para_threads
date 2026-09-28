import JSZip from 'jszip';
import { StatusBar } from 'expo-status-bar';
import { type ChangeEvent, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import 'bootstrap/dist/css/bootstrap.min.css';

type ZipEntry = {
  path: string;
  isFolder: boolean;
  size: number;
};

type Follower = {
  username: string;
  href: string;
};

type SocialFile = {
  path: string;
  entry: JSZip.JSZipObject;
};

const accountsPerPage = 100;

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersSource, setFollowersSource] = useState('');
  const [isFollowersExpanded, setIsFollowersExpanded] = useState(false);
  const [followersPage, setFollowersPage] = useState(0);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [followingSource, setFollowingSource] = useState('');
  const [isFollowingExpanded, setIsFollowingExpanded] = useState(false);
  const [followingPage, setFollowingPage] = useState(0);
  const [isNotFollowingExpanded, setIsNotFollowingExpanded] = useState(false);
  const [notFollowingPage, setNotFollowingPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const openFilePicker = () => {
    if (Platform.OS !== 'web') {
      setError('La carga de archivos está disponible en la versión web por ahora.');
      return;
    }

    inputRef.current?.click();
  };

  const readZip = async (file: File) => {
    setError('');
    setFileName(file.name);
    setEntries([]);
    setFollowers([]);
    setFollowersSource('');
    setIsFollowersExpanded(false);
    setFollowersPage(0);
    setFollowing([]);
    setFollowingSource('');
    setIsFollowingExpanded(false);
    setFollowingPage(0);
    setIsNotFollowingExpanded(false);
    setNotFollowingPage(0);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Selecciona un archivo con extensión .zip.');
      return;
    }

    setIsLoading(true);

    try {
      const zip = await JSZip.loadAsync(file);
      const nextEntries = Object.values(zip.files)
        .map((entry) => ({
          path: entry.name,
          isFolder: entry.dir,
          size: 0,
        }))
        .sort((first, second) => first.path.localeCompare(second.path));

      setEntries(nextEntries);
      const followerFiles = findSocialFiles(nextEntries, zip, 'follower');
      if (followerFiles.length) {
        const nextFollowers = await extractFollowersFromFiles(followerFiles);
        setFollowers(nextFollowers);
        setFollowersSource(followerFiles.map((file) => file.path).join(', '));
      }
      const followingFiles = findSocialFiles(nextEntries, zip, 'following');
      if (followingFiles.length) {
        const nextFollowing = await extractFollowersFromFiles(followingFiles);
        setFollowing(nextFollowing);
        setFollowingSource(followingFiles.map((file) => file.path).join(', '));
      }
    } catch {
      setFileName('');
      setError('No se pudo leer el ZIP. Comprueba que el archivo no esté dañado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void readZip(file);
    }
    event.target.value = '';
  };

  const openProfile = (href: string) => {
    if (Platform.OS === 'web') {
      const profileWindow = window.open(href, '_blank', 'noopener,noreferrer');
      profileWindow?.blur();
      window.focus();
      window.setTimeout(() => window.focus(), 0);
    }
  };

  const followerUsernames = new Set(followers.map((follower) => follower.username));
  const notFollowingBack = following.filter((account) => !followerUsernames.has(account.username));
  const followersPageItems = followers.slice(
    followersPage * accountsPerPage,
    (followersPage + 1) * accountsPerPage,
  );
  const followingPageItems = following.slice(
    followingPage * accountsPerPage,
    (followingPage + 1) * accountsPerPage,
  );
  const notFollowingPageItems = notFollowingBack.slice(
    notFollowingPage * accountsPerPage,
    (notFollowingPage + 1) * accountsPerPage,
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>ZIP THREADS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Platform.OS === 'web' && (
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleFileChange}
            style={styles.hiddenInput}
          />
        )}

        <View style={styles.uploadPanel}>
          <Text style={styles.panelTitle}>Carga tu archivo</Text>
          <Text style={styles.panelText}>Solo necesitamos el .zip. Todo se procesa localmente en el navegador.</Text>
          <Pressable style={styles.primaryButton} onPress={openFilePicker} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Seleccionar ZIP</Text>
          </Pressable>
          <Text style={styles.hint}>Extensión admitida: .zip</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isLoading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#d96843" />
            <Text style={styles.statusText}>Leyendo la estructura...</Text>
          </View>
        ) : null}

        {fileName && !isLoading ? (
          <View style={styles.results}>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.sectionLabel}>ARCHIVO CARGADO</Text>
                <Text style={styles.fileName}>{fileName}</Text>
              </View>
            </View>
            {followersSource ? (
              <View style={styles.followersPanel}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isFollowersExpanded }}
                  onPress={() => setIsFollowersExpanded((expanded) => !expanded)}
                  style={styles.followersHeader}
                >
                  <View>
                    <Text style={styles.sectionLabel}>TUS SEGUIDORES</Text>
                    <Text style={styles.followersCount}>{followers.length}</Text>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.sourceText} numberOfLines={1}>{followersSource}</Text>
                    <Text style={styles.expandIcon}>{isFollowersExpanded ? '−' : '+'}</Text>
                  </View>
                </Pressable>
                {isFollowersExpanded && followers.length ? (
                  <View style={styles.followersList}>
                    <View style={styles.accountsGrid}>
                    {followersPageItems.map((follower) => (
                      <View
                        key={follower.username}
                        style={styles.accountTile}
                      >
                        <Text style={styles.avatar}>{follower.username.slice(0, 1).toUpperCase()}</Text>
                        <Text style={styles.username}>@{follower.username}</Text>
                        <ProfileLink href={follower.href} onPress={() => openProfile(follower.href)} />
                      </View>
                    ))}
                    </View>
                    <Pagination
                      page={followersPage}
                      totalItems={followers.length}
                      onPrevious={() => setFollowersPage((page) => page - 1)}
                      onNext={() => setFollowersPage((page) => page + 1)}
                    />
                  </View>
                ) : isFollowersExpanded ? (
                  <Text style={styles.emptyText}>Se encontró el JSON, pero no contiene usuarios reconocibles.</Text>
                ) : null}
              </View>
            ) : null}
            {followingSource ? (
              <View style={styles.followersPanel}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isFollowingExpanded }}
                  onPress={() => setIsFollowingExpanded((expanded) => !expanded)}
                  style={styles.followersHeader}
                >
                  <View>
                    <Text style={styles.sectionLabel}>CUENTAS QUE SIGUES</Text>
                    <Text style={styles.followersCount}>{following.length}</Text>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.sourceText} numberOfLines={1}>{followingSource}</Text>
                    <Text style={styles.expandIcon}>{isFollowingExpanded ? '−' : '+'}</Text>
                  </View>
                </Pressable>
                {isFollowingExpanded && following.length ? (
                  <View style={styles.followersList}>
                    <View style={styles.accountsGrid}>
                    {followingPageItems.map((account) => (
                      <View
                        key={account.username}
                        style={styles.accountTile}
                      >
                        <Text style={styles.avatar}>{account.username.slice(0, 1).toUpperCase()}</Text>
                        <Text style={styles.username}>@{account.username}</Text>
                        <ProfileLink href={account.href} onPress={() => openProfile(account.href)} />
                      </View>
                    ))}
                    </View>
                    <Pagination
                      page={followingPage}
                      totalItems={following.length}
                      onPrevious={() => setFollowingPage((page) => page - 1)}
                      onNext={() => setFollowingPage((page) => page + 1)}
                    />
                  </View>
                ) : isFollowingExpanded ? (
                  <Text style={styles.emptyText}>Se encontró el JSON, pero no contiene usuarios reconocibles.</Text>
                ) : null}
              </View>
            ) : null}
            {followingSource && followersSource ? (
              <View style={styles.followersPanel}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isNotFollowingExpanded }}
                  onPress={() => setIsNotFollowingExpanded((expanded) => !expanded)}
                  style={styles.followersHeader}
                >
                  <View>
                    <Text style={styles.sectionLabel}>NO TE SIGUEN DE VUELTA</Text>
                    <Text style={styles.followersCount}>{notFollowingBack.length}</Text>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.sourceText} numberOfLines={1}>CUENTAS QUE SIGUES</Text>
                    <Text style={styles.expandIcon}>{isNotFollowingExpanded ? '−' : '+'}</Text>
                  </View>
                </Pressable>
                {isNotFollowingExpanded && notFollowingBack.length ? (
                  <View style={styles.followersList}>
                    <View style={styles.accountsGrid}>
                    {notFollowingPageItems.map((account) => (
                      <View
                        key={account.username}
                        style={styles.accountTile}
                      >
                        <Text style={styles.avatar}>{account.username.slice(0, 1).toUpperCase()}</Text>
                        <Text style={styles.username}>@{account.username}</Text>
                        <ProfileLink href={account.href} onPress={() => openProfile(account.href)} />
                      </View>
                    ))}
                    </View>
                    <Pagination
                      page={notFollowingPage}
                      totalItems={notFollowingBack.length}
                      onPrevious={() => setNotFollowingPage((page) => page - 1)}
                      onNext={() => setNotFollowingPage((page) => page + 1)}
                    />
                  </View>
                ) : isNotFollowingExpanded ? (
                  <Text style={styles.emptyText}>Todas las cuentas que sigues también te siguen.</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ProfileLink({ href, onPress }: { href: string; onPress: () => void }) {
  if (Platform.OS === 'web') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          backgroundColor: '#d96843',
          borderRadius: 5,
          color: '#fffaf3',
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 700,
          marginTop: 8,
          padding: '7px 10px',
          textDecoration: 'none',
        }}
      >
        Ver perfil ↗
      </a>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.profileButton}>
      <Text style={styles.profileButtonText}>Ver perfil ↗</Text>
    </Pressable>
  );
}

function Pagination({
  page,
  totalItems,
  onPrevious,
  onNext,
}: {
  page: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.ceil(totalItems / accountsPerPage);
  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  return (
    <View style={styles.pagination}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasPrevious }}
        disabled={!hasPrevious}
        onPress={onPrevious}
        style={[styles.paginationButton, !hasPrevious && styles.paginationButtonDisabled]}
      >
        <Text style={styles.paginationButtonText}>Atrás</Text>
      </Pressable>
      <Text style={styles.paginationStatus}>Página {page + 1} de {Math.max(totalPages, 1)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasNext }}
        disabled={!hasNext}
        onPress={onNext}
        style={[styles.paginationButton, !hasNext && styles.paginationButtonDisabled]}
      >
        <Text style={styles.paginationButtonText}>Siguiente</Text>
      </Pressable>
    </View>
  );
}

function findSocialFiles(entries: ZipEntry[], zip: JSZip, type: 'follower' | 'following') {
  return entries
    .filter((entry) => {
      const fileName = entry.path.split('/').pop()?.toLowerCase() ?? '';
      return !entry.isFolder && isSocialFileName(fileName, type);
    })
    .map((entry) => ({ path: entry.path, entry: zip.files[entry.path] }));
}

function isSocialFileName(fileName: string, type: 'follower' | 'following') {
  if (type === 'follower') {
    return /^followers(?:_\d+)?\.(json|html)$/.test(fileName);
  }

  return /^following(?:_\d+)?\.(json|html)$/.test(fileName);
}

async function extractFollowersFromFiles(files: SocialFile[]) {
  const found = new Map<string, Follower>();

  for (const file of files) {
    const content = await file.entry.async('string');
    try {
      const extracted = file.path.toLowerCase().endsWith('.html')
        ? extractFollowersFromHtml(content)
        : extractFollowers(JSON.parse(content));
      extracted.forEach((follower) => found.set(follower.username, follower));
    } catch {
      continue;
    }
  }

  return Array.from(found.values()).sort((first, second) => first.username.localeCompare(second.username));
}

function extractFollowersFromHtml(content: string) {
  const found = new Map<string, Follower>();
  const document = new DOMParser().parseFromString(content, 'text/html');

  document.querySelectorAll('a[href]').forEach((link) => {
    const username = normalizeUsername(link.textContent ?? '');
    const href = link.getAttribute('href');
    if (username) {
      found.set(username, { username, href: profileUrl(username, href) });
    }
  });

  return Array.from(found.values());
}

function extractFollowers(data: unknown): Follower[] {
  const found = new Map<string, Follower>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const list = record.string_list_data;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const itemRecord = item as Record<string, unknown>;
        const username = normalizeUsername(itemRecord.value ?? itemRecord.username);
        if (username) {
          found.set(username, {
            username,
            href: profileUrl(username, itemRecord.href),
          });
        }
      });
    }

    const username = normalizeUsername(record.username ?? record.user_name ?? record.handle);
    if (username) {
      found.set(username, {
        username,
        href: profileUrl(username, record.href),
      });
    }

    Object.values(record).forEach(visit);
  };

  visit(data);
  return Array.from(found.values()).sort((first, second) => first.username.localeCompare(second.username));
}

function normalizeUsername(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@/, '').replace(/\s+/g, '');
}

function profileUrl(username: string, originalHref: unknown) {
  if (typeof originalHref === 'string' && /^https?:\/\//i.test(originalHref)) return originalHref;
  return `https://www.threads.net/@${encodeURIComponent(username)}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f1ea',
  },
  header: {
    backgroundColor: '#182b35',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 56,
  },
  headerInner: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  eyebrow: {
    color: '#f0a27d',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  title: {
    color: '#fffaf3',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 45,
    maxWidth: 600,
  },
  subtitle: {
    color: '#b8c7c7',
    fontSize: 16,
    lineHeight: 25,
    marginTop: 14,
    maxWidth: 540,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 64,
  },
  hiddenInput: {
    display: 'none',
  },
  uploadPanel: {
    alignItems: 'center',
    backgroundColor: '#fffaf3',
    borderColor: '#decfc0',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  panelTitle: {
    color: '#182b35',
    fontSize: 22,
    fontWeight: '700',
  },
  panelText: {
    color: '#647274',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 8,
    maxWidth: 440,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#d96843',
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#fffaf3',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: '#8c9896',
    fontSize: 12,
    marginTop: 14,
  },
  error: {
    color: '#a63b32',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  statusText: {
    color: '#647274',
    fontSize: 14,
  },
  results: {
    backgroundColor: '#fffaf3',
    borderColor: '#decfc0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    overflow: 'hidden',
  },
  resultsHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#eadfd4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  sectionLabel: {
    color: '#d96843',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  fileName: {
    color: '#182b35',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  counts: {
    alignItems: 'flex-end',
    gap: 4,
  },
  countText: {
    color: '#647274',
    fontSize: 13,
  },
  tree: {
    padding: 12,
  },
  followersPanel: {
    borderTopColor: '#eadfd4',
    borderTopWidth: 1,
  },
  followersHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  followersHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    marginLeft: 16,
  },
  followersCount: {
    color: '#182b35',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
  },
  sourceText: {
    color: '#9aa4a1',
    flexShrink: 1,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 11,
    marginLeft: 16,
    maxWidth: 360,
  },
  expandIcon: {
    color: '#d96843',
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 16,
    width: 20,
  },
  followersList: {
    borderTopColor: '#eadfd4',
    borderTopWidth: 1,
    padding: 12,
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accountTile: {
    alignItems: 'center',
    borderBottomColor: '#f0e8df',
    borderBottomWidth: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 112,
    paddingHorizontal: 8,
    width: '33.3333%',
  },
  followerRow: {
    alignItems: 'center',
    borderBottomColor: '#f0e8df',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 8,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#f5d8ca',
    borderRadius: 16,
    color: '#b64f31',
    fontSize: 13,
    fontWeight: '800',
    height: 32,
    lineHeight: 32,
    marginRight: 12,
    textAlign: 'center',
    width: 32,
  },
  username: {
    color: '#182b35',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  profileLink: {
    color: '#d96843',
    fontSize: 13,
    fontWeight: '700',
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: '#d96843',
    borderRadius: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileButtonText: {
    color: '#fffaf3',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#647274',
    fontSize: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  paginationButton: {
    backgroundColor: '#d96843',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  paginationButtonDisabled: {
    backgroundColor: '#decfc0',
  },
  paginationButtonText: {
    color: '#fffaf3',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationStatus: {
    color: '#647274',
    fontSize: 13,
  },
  treeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 8,
  },
  treeIcon: {
    color: '#d96843',
    fontSize: 16,
    textAlign: 'center',
    width: 24,
  },
  treePath: {
    color: '#46585d',
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 13,
  },
  folderPath: {
    color: '#182b35',
    fontWeight: '700',
  },
  fileSize: {
    color: '#9aa4a1',
    fontSize: 12,
    marginLeft: 12,
  },
  moreText: {
    color: '#d96843',
    fontSize: 13,
    paddingHorizontal: 32,
    paddingTop: 12,
  },
});
