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
  useWindowDimensions,
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
  const { width: windowWidth } = useWindowDimensions();
  const accountColumns = windowWidth < 560 ? 2 : windowWidth < 900 ? 3 : 5;
  const [fileName, setFileName] = useState('');
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersSource, setFollowersSource] = useState('');
  const [isFollowersExpanded, setIsFollowersExpanded] = useState(true);
  const [followersPage, setFollowersPage] = useState(0);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [followingSource, setFollowingSource] = useState('');
  const [isFollowingExpanded, setIsFollowingExpanded] = useState(false);
  const [followingPage, setFollowingPage] = useState(0);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [pendingPage, setPendingPage] = useState(0);
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
    setIsFollowersExpanded(true);
    setFollowersPage(0);
    setFollowing([]);
    setFollowingSource('');
    setIsFollowingExpanded(false);
    setFollowingPage(0);
    setIsPendingExpanded(false);
    setPendingPage(0);
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
  const followingUsernames = new Set(following.map((account) => account.username));
  const notFollowingBack = following.filter((account) => !followerUsernames.has(account.username));
  const pendingFollows = followers.filter((account) => !followingUsernames.has(account.username));
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
  const pendingPageItems = pendingFollows.slice(
    pendingPage * accountsPerPage,
    (pendingPage + 1) * accountsPerPage,
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.brand}>THREADS</Text>
          <Text style={styles.help}>Ayuda</Text>
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

        {!fileName ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>THREADS DATA READER</Text>
              <Text style={styles.title}>Tu red, en orden.</Text>
              <Text style={styles.subtitle}>Explora tus conexiones de Threads sin enviar tus datos a ningún servidor.</Text>
            </View>

            <View style={styles.uploadPanel}>
              <Text style={styles.uploadIcon}>↑</Text>
              <Text style={styles.panelTitle}>Carga tu archivo de Threads</Text>
              <Text style={styles.panelText}>Selecciona la descarga de tu información en formato .zip. Todo se procesa localmente en tu navegador.</Text>
              <Pressable style={styles.primaryButton} onPress={openFilePicker} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Buscar archivo .zip</Text>
              </Pressable>
              <Text style={styles.hint}>PROCESAMIENTO LOCAL · TUS DATOS NO SALEN DE ESTE DISPOSITIVO</Text>
            </View>
          </>
        ) : null}

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
              <Text style={styles.fileIcon}>▤</Text>
              <View style={styles.fileMeta}>
                <Text style={styles.sectionLabel}>ARCHIVO CARGADO</Text>
                <Text numberOfLines={1} style={styles.fileName}>{fileName}</Text>
              </View>
              <Text style={styles.readyLabel}>LISTO</Text>
            </View>
            <View style={styles.metrics}>
              <Metric label="Seguidores" count={followers.length} index={0} compact={windowWidth < 640} />
              <Metric label="Siguiendo" count={following.length} index={1} compact={windowWidth < 640} />
              <Metric label="Pendientes" count={pendingFollows.length} index={2} compact={windowWidth < 640} />
              <Metric label="No te siguen" count={notFollowingBack.length} index={3} compact={windowWidth < 640} />
            </View>
            {followersSource ? (
              <View style={styles.followersPanel}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isFollowersExpanded }}
                  onPress={() => setIsFollowersExpanded((expanded) => !expanded)}
                  style={styles.followersHeader}
                >
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionIcon}>◎</Text>
                    <View>
                      <Text style={styles.sectionLabel}>PEOPLE WHO FOLLOW YOU</Text>
                      <Text style={styles.listTitle}>Seguidores</Text>
                    </View>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.panelCount}>{followers.length}</Text>
                    <Text style={styles.expandIcon}>{isFollowersExpanded ? '⌃' : '⌄'}</Text>
                  </View>
                </Pressable>
                {isFollowersExpanded && followers.length ? (
                  <View style={styles.followersList}>
                    <AccountGrid accounts={followersPageItems} page={followersPage} columns={accountColumns} onOpen={openProfile} />
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
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionIcon}>↗</Text>
                    <View>
                      <Text style={styles.sectionLabel}>PEOPLE YOU FOLLOW</Text>
                      <Text style={styles.listTitle}>Siguiendo</Text>
                    </View>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.panelCount}>{following.length}</Text>
                    <Text style={styles.expandIcon}>{isFollowingExpanded ? '⌃' : '⌄'}</Text>
                  </View>
                </Pressable>
                {isFollowingExpanded && following.length ? (
                  <View style={styles.followersList}>
                    <AccountGrid accounts={followingPageItems} page={followingPage} columns={accountColumns} onOpen={openProfile} />
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
            {followersSource && followingSource ? (
              <View style={styles.followersPanel}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isPendingExpanded }}
                  onPress={() => setIsPendingExpanded((expanded) => !expanded)}
                  style={styles.followersHeader}
                >
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionIcon}>○</Text>
                    <View>
                      <Text style={styles.sectionLabel}>PEOPLE YOU DON'T FOLLOW BACK</Text>
                      <Text style={styles.listTitle}>Pendientes</Text>
                    </View>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.panelCount}>{pendingFollows.length}</Text>
                    <Text style={styles.expandIcon}>{isPendingExpanded ? '⌃' : '⌄'}</Text>
                  </View>
                </Pressable>
                {isPendingExpanded && pendingFollows.length ? (
                  <View style={styles.followersList}>
                    <AccountGrid accounts={pendingPageItems} page={pendingPage} columns={accountColumns} onOpen={openProfile} />
                    <Pagination
                      page={pendingPage}
                      totalItems={pendingFollows.length}
                      onPrevious={() => setPendingPage((page) => page - 1)}
                      onNext={() => setPendingPage((page) => page + 1)}
                    />
                  </View>
                ) : isPendingExpanded ? (
                  <Text style={styles.emptyText}>No hay cuentas pendientes.</Text>
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
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionIcon}>↙</Text>
                    <View>
                      <Text style={styles.sectionLabel}>PEOPLE YOU FOLLOW</Text>
                      <Text style={styles.listTitle}>No te siguen</Text>
                    </View>
                  </View>
                  <View style={styles.followersHeaderRight}>
                    <Text style={styles.panelCount}>{notFollowingBack.length}</Text>
                    <Text style={styles.expandIcon}>{isNotFollowingExpanded ? '⌃' : '⌄'}</Text>
                  </View>
                </Pressable>
                {isNotFollowingExpanded && notFollowingBack.length ? (
                  <View style={styles.followersList}>
                    <AccountGrid accounts={notFollowingPageItems} page={notFollowingPage} columns={accountColumns} onOpen={openProfile} />
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

function Metric({ label, count, index, compact }: { label: string; count: number; index: number; compact: boolean }) {
  const showDivider = compact ? index % 2 === 0 : index < 3;

  return (
    <View style={[styles.metric, compact && styles.metricCompact, showDivider && styles.metricDivider]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{count}</Text>
    </View>
  );
}

function AccountGrid({
  accounts,
  page,
  columns,
  onOpen,
}: {
  accounts: Follower[];
  page: number;
  columns: number;
  onOpen: (href: string) => void;
}) {
  return (
    <View style={styles.accountsGrid}>
      {accounts.map((account, index) => {
        const content = (
          <>
            <Text style={styles.accountIndex}>{page * accountsPerPage + index + 1}</Text>
            <Text numberOfLines={1} style={styles.username}>@{account.username}</Text>
          </>
        );

        return Platform.OS === 'web' ? (
          <a
            key={account.username}
            href={account.href}
            target="_blank"
            rel="noreferrer"
            style={{
              alignItems: 'center',
              borderBottom: '1px solid #e1dbd0',
              boxSizing: 'border-box',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'row',
              minHeight: 43,
              padding: '0 7px',
              textDecoration: 'none',
              width: `${100 / columns}%`,
            }}
          >
            {content}
          </a>
        ) : (
          <Pressable
            key={account.username}
            accessibilityRole="link"
            onPress={() => onOpen(account.href)}
            style={[styles.accountTile, { width: `${100 / columns}%` }]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
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
    backgroundColor: '#f3f0e8',
  },
  header: {
    backgroundColor: '#f3f0e8',
    borderBottomColor: '#ddd6ca',
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#26392e',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  help: {
    color: '#536458',
    fontSize: 14,
  },
  eyebrow: {
    color: '#71836f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 18,
  },
  title: {
    color: '#26392e',
    fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined,
    fontSize: 58,
    fontWeight: '500',
    lineHeight: 66,
    maxWidth: 720,
  },
  subtitle: {
    color: '#657267',
    fontSize: 17,
    lineHeight: 27,
    marginTop: 16,
    maxWidth: 560,
  },
  hero: {
    paddingTop: 66,
    paddingBottom: 34,
  },
  content: {
    width: '100%',
    maxWidth: 1090,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingBottom: 64,
  },
  hiddenInput: {
    display: 'none',
  },
  uploadPanel: {
    alignItems: 'center',
    backgroundColor: '#fbfcf8',
    borderColor: '#aab9a7',
    borderRadius: 4,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  uploadIcon: {
    alignItems: 'center',
    backgroundColor: '#e6ebe2',
    borderRadius: 24,
    color: '#526a55',
    fontSize: 24,
    fontWeight: '500',
    height: 48,
    lineHeight: 48,
    marginBottom: 18,
    textAlign: 'center',
    width: 48,
  },
  panelTitle: {
    color: '#26392e',
    fontSize: 20,
    fontWeight: '600',
  },
  panelText: {
    color: '#657267',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 10,
    maxWidth: 440,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#526a55',
    borderRadius: 4,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: '#849184',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 18,
    textAlign: 'center',
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
    backgroundColor: 'transparent',
    marginTop: 0,
  },
  resultsHeader: {
    alignItems: 'center',
    backgroundColor: '#f7f5ef',
    borderColor: '#d8d1c5',
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileIcon: {
    color: '#d85c43',
    fontSize: 24,
    marginRight: 14,
  },
  readyLabel: {
    color: '#438b79',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 10,
    letterSpacing: 1,
    marginLeft: 'auto',
  },
  metrics: {
    borderBottomColor: '#d8d1c5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
  },
  metric: {
    borderRightColor: '#d8d1c5',
    borderRightWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 22,
    width: '25%',
  },
  metricCompact: {
    width: '50%',
  },
  metricDivider: {
    borderRightColor: '#d8d1c5',
  },
  metricLabel: {
    color: '#89908a',
    fontSize: 12,
    marginBottom: 8,
  },
  metricValue: {
    color: '#172d40',
    fontSize: 27,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#8b9694',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  fileName: {
    color: '#172d40',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
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
    backgroundColor: '#f7f5ef',
    borderColor: '#d8d1c5',
    borderWidth: 1,
    marginBottom: 16,
  },
  followersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: '#f1d4c8',
    borderRadius: 20,
    color: '#b9503b',
    fontSize: 20,
    height: 40,
    lineHeight: 40,
    marginRight: 14,
    textAlign: 'center',
    width: 40,
  },
  listTitle: {
    color: '#172d40',
    fontSize: 21,
    fontWeight: '600',
    marginTop: 2,
  },
  followersHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 10,
  },
  panelCount: {
    color: '#77818a',
    fontSize: 13,
  },
  expandIcon: {
    color: '#78827d',
    fontSize: 22,
    marginLeft: 18,
  },
  followersList: {
    borderTopColor: '#d8d1c5',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accountTile: {
    alignItems: 'center',
    borderBottomColor: '#e1dbd0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 43,
    paddingHorizontal: 7,
  },
  accountIndex: {
    color: '#ac9e8c',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 9,
    marginRight: 8,
  },
  username: {
    color: '#243d56',
    flex: 1,
    fontSize: 11,
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
