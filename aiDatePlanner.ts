/*
  Minimal ambient declarations so `tsc` can typecheck this repo in constrained environments
  where node_modules (and @types/*) may not be installed.

  When you install real dependencies locally, you can delete this file and rely on proper typings.
*/

declare module 'react' {
  export type ReactNode = any;
  export type ComponentType<P = any> = any;
  type ComponentProps<T = any> = any;
  export type FC<P = any> = (props: P) => any;
  export type PropsWithChildren<P = any> = P & { children?: ReactNode };
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);

  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps?: any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useContext<T>(ctx: any): T;
  export function createContext<T>(value: T): any;
  export function memo<T>(c: T): T;
  export function lazy<T>(loader: any): any;
  export const Suspense: any;
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  // Allow React's special props even when we stub JSX.
  type Element = any;
  interface IntrinsicAttributes {
    key?: any;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react-native' {
  export const Platform: any;
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export const SafeAreaView: any;
  export const TouchableOpacity: any;
  export const Pressable: any;
  export const TextInput: any;
  export const Switch: any;
  export const Image: any;
  export const Animated: any;
  export const StyleSheet: any;
  export const ActivityIndicator: any;
  export const RefreshControl: any;
  export const FlatList: any;
  export const SectionList: any;
  export const Alert: any;
  export const ActionSheetIOS: any;
  export const Linking: any;
  export const KeyboardAvoidingView: any;
  export const Keyboard: any;
  export const Dimensions: any;
  export const StatusBar: any;
  export const Modal: any;
  export const AppState: any;
  export const Easing: any;
  export function useColorScheme(): any;
  export type StyleProp<T> = any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
  export type FlatListProps<T> = any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
    multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
    multiRemove(keys: string[]): Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'react-native-calendars' {
  export const Calendar: any;
  export const Agenda: any;
}

declare module 'expo-image-picker' {
  const ImagePicker: any;
  export default ImagePicker;
  export const launchImageLibraryAsync: any;
  export const requestMediaLibraryPermissionsAsync: any;
}

declare module '@expo/vector-icons' {
  export const Ionicons: any;
  export const MaterialIcons: any;
  export const Feather: any;
  export const FontAwesome: any;
}

declare module '@react-navigation/native' {
  export const NavigationContainer: any;
  export function useNavigation<T = any>(): T;
  export function useRoute<T = any>(): T;
  export function useFocusEffect(effect: () => void | (() => void)): void;
  export function useNavigationState<T = any>(selector: (state: any) => T): T;
  export type CompositeScreenProps<A, B> = any;
  export type CompositeNavigationProp<A, B> = any;
  export type RouteProp<P, R extends keyof P> = any;
}

declare module '@react-navigation/native-stack' {
  export type NativeStackScreenProps<P, R extends keyof P> = any;
  export function createNativeStackNavigator<P>(): any;
}

declare module '@react-navigation/stack' {
  export type StackScreenProps<P, R extends keyof P = keyof P> = any;
  export type StackNavigationProp<P, R extends keyof P = keyof P> = any;
  export function createStackNavigator<P>(): any;
  export const TransitionPresets: any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<P>(): any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaView: any;
  export const SafeAreaProvider: any;
  export function useSafeAreaInsets(): any;
}

declare module 'expo-location' {
  export const Accuracy: any;
  export function requestForegroundPermissionsAsync(): Promise<{ status: 'granted' | 'denied' | string }>; 
  export function getCurrentPositionAsync(opts?: any): Promise<{ coords: { latitude: number; longitude: number } }>; 
  export function reverseGeocodeAsync(coords: { latitude: number; longitude: number }): Promise<any[]>;
}

declare module 'expo-sqlite' {
  export type SQLiteDatabase = any;
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}

declare module '@sentry/react-native' {
  export const init: (opts: any) => void;
  export const captureException: (err: any, ctx?: any) => void;
  export const setTag: (k: string, v: string) => void;
  export const setUser: (u: any) => void;
  export const withScope: (cb: (scope: any) => void) => void;
  export const getGlobalScope: () => any;
}

declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type ComponentType<P = any> = any;
  type FC<P = any> = any;
}

declare module 'react-native-gesture-handler' {
  export const Swipeable: any;
  export const RectButton: any;
  export const GestureHandlerRootView: any;
  export const ScrollView: any;
  export const FlatList: any;
}

declare module 'react-native-svg' {
  const Svg: any;
  export default Svg;
  export const Circle: any;
  export const G: any;
  export const Path: any;
  export const Defs: any;
  export const LinearGradient: any;
  export const Stop: any;
}

declare module 'expo-linear-gradient' {
  export const LinearGradient: any;
}

declare module 'expo-clipboard' {
  export const setStringAsync: any;
}

declare module 'expo-file-system' {
  const FileSystem: any;
  export default FileSystem;
  export const readAsStringAsync: any;
  export const writeAsStringAsync: any;
  export const getInfoAsync: any;
  export const documentDirectory: any;
}

declare module 'expo-file-system/legacy' {
  export const readAsStringAsync: any;
  export const writeAsStringAsync: any;
  export const getInfoAsync: any;
  export const documentDirectory: any;
}

declare module '@react-navigation/bottom-tabs' {
  export type BottomTabScreenProps<P, R extends keyof P> = any;
  export type BottomTabNavigationProp<P = any> = any;
  export function createBottomTabNavigator<P>(): any;
}

declare module '@react-navigation/native-stack' {
  export type NativeStackNavigationProp<P = any> = any;
  export function createNativeStackNavigator<P>(): any;
}

declare module 'react-native' {
  export const Share: any;
}

declare module 'zod' {
  /** Stub type used when zod is not installed. All methods return any. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const z: any & {
    ZodType: any;
    ZodSchema: any;
    infer: any;
    object: any; string: any; number: any; boolean: any; array: any;
    union: any; literal: any; optional: any; nullable: any;
    record: any; any: any; unknown: any; enum: any; tuple: any; date: any;
  };
  export { z };
  export default z;
  export type ZodType<T = unknown, D = unknown, I = unknown> = any;
  export type ZodSchema<T = unknown> = any;
  export type infer<T> = any;
  export type output<T> = any;
  export const object: any; export const string: any; export const number: any;
  export const boolean: any; export const array: any; export const union: any;
  export const literal: any; export const optional: any; export const nullable: any;
  export const record: any; export const any: any; export const unknown: any;
  export const tuple: any; export const date: any;
}

// zod namespace for z.ZodType<T> usage patterns
declare namespace z {
  type ZodType<T = unknown, D = unknown, I = unknown> = import('zod').ZodType<T, D, I>;
  type ZodSchema<T = unknown> = import('zod').ZodSchema<T>;
  type infer<T> = any;
}

declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
  export function getApp(): any;
  export type FirebaseApp = any;
}

declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
  export function initializeAuth(app: any, opts?: any): any;
  export function getReactNativePersistence(storage: any): any;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function createUserWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function signInAnonymously(auth: any): Promise<any>;
  export function signOut(auth: any): Promise<void>;
  export function onAuthStateChanged(auth: any, nextOrObserver: ((user: any) => void), error?: (error: any) => void, completed?: () => void): () => void;
  export function updateProfile(user: any, data: any): Promise<void>;
  export function sendPasswordResetEmail(auth: any, email: string): Promise<void>;
  export type User = any;
  export type Auth = any;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export function collection(db: any, ...pathSegments: string[]): any;
  export function doc(db: any, ...pathSegments: string[]): any;
  export function getDoc(ref: any): Promise<any>;
  export function getDocs(query: any): Promise<any>;
  export function setDoc(ref: any, data: any, opts?: any): Promise<void>;
  export function updateDoc(ref: any, data: any): Promise<void>;
  export function deleteDoc(ref: any): Promise<void>;
  export function addDoc(ref: any, data: any): Promise<any>;
  export function query(ref: any, ...constraints: any[]): any;
  export function where(field: string, op: string, value: any): any;
  export function orderBy(field: string, dir?: string): any;
  export function limit(n: number): any;
  export function onSnapshot(ref: any, cb: (snap: any) => void, ...rest: any[]): () => void;
  export function serverTimestamp(): any;
  export function writeBatch(db: any): any;
  export function initializeFirestore(app: any, settings: any): any;
  export function runTransaction(db: any, fn: (t: any) => Promise<any>): Promise<any>;
  export const Timestamp: any;
  export type Firestore = any;
  export type DocumentReference = any;
  export type CollectionReference = any;
  export type QuerySnapshot = any;
  export type DocumentSnapshot = any;
  export type Unsubscribe = () => void;
}

declare module 'firebase/functions' {
  export function getFunctions(app?: any, region?: string): any;
  export function httpsCallable<TReq = any, TRes = any>(functions: any, name: string): (data?: TReq) => Promise<{ data: TRes }>;
  export type Functions = any;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'expo-sharing' {
  export const isAvailableAsync: any;
  export const shareAsync: any;
}

declare module 'expo-document-picker' {
  export const getDocumentAsync: any;
  export type DocumentPickerResult = any;
}

declare module 'react-native-view-shot' {
  export const captureRef: any;
  const ViewShot: any;
  export default ViewShot;
}


// expo-calendar is a native module; use any to avoid stubbing its full API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'expo-calendar';
