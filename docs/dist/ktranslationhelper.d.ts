/*!
 * kTranslationHelper — type declarations.
 * Hand-written; keep in step with DEFAULTS, DEFAULT_STRINGS and the public API in ktranslationhelper.js.
 */

/** A language offered in "Translate to". */
export interface Language {
  /** BCP 47 code, e.g. 'en', 'zh-Hans'. */
  code: string;
  /** Name shown to the visitor. Defaults to the language's own name from Intl.DisplayNames. */
  name?: string;
  /** Text direction of the language. Detected for common right-to-left languages. */
  dir?: 'ltr' | 'rtl';
}

/** The plugin's own interface text. Every key is optional in `strings`; missing keys use English. */
export interface Strings {
  message: string;
  messageClick: string;
  messageTouch: string;
  messageHotkey: string;
  gotIt: string;
  badge: string;
  badgeMissing: string;
  /** Announced to screen readers when the mode is turned on / off. */
  modeOn: string;
  modeOff: string;
  pick: string;
  pickHint: string;
  list: string;
  exit: string;
  title: string;
  key: string;
  which: string;
  whichText: string;
  whichParent: string;
  current: string;
  original: string;
  existing: string;
  noExisting: string;
  fallbackNotice: string;
  targetLang: string;
  otherLangNotice: string;
  usePageLang: string;
  proposal: string;
  htmlAllowed: string;
  comment: string;
  commentPlaceholder: string;
  missingPlaceholders: string;
  charCount: string;
  tooLong: string;
  draftRestored: string;
  discardDraft: string;
  alreadySuggested: string;
  unchanged: string;
  empty: string;
  cancel: string;
  /** Submit button with review: true ("Submit for review"). */
  submit: string;
  submitting: string;
  /** Submit button with review: false ("Save"). */
  save: string;
  saving: string;
  /** Submit button in local mode ("Apply"). */
  apply: string;
  success: string;
  localApplied: string;
  error: string;
  nextMissing: string;
  close: string;
  listTitle: string;
  listFilter: string;
  listMissingOnly: string;
  listEmpty: string;
  listMissing: string;
  listHidden: string;
  listSuggested: string;
  help: string;
  helpTitle: string;
  helpLegend: string;
  legendText: string;
  legendHover: string;
  legendMissing: string;
  legendSuggested: string;
  helpHow: string;
  helpPick: string;
  helpList: string;
  helpMissing: string;
  helpEditor: string;
  helpEditorPageOnly: string;
  helpPlaceholders: string;
  helpPlaceholdersGeneric: string;
  helpHtml: string;
  helpDrafts: string;
  helpLocal: string;
  helpApplyAlways: string;
  helpApplySuccess: string;
  helpApplyNever: string;
  helpSavedAlways: string;
  helpSavedSuccess: string;
  helpSavedNever: string;
  helpExit: string;
  helpExitNoPersist: string;
}

/** What is sent to `submitUrl` or passed to `submit`. */
export interface Payload {
  /** Translation key. */
  key: string;
  /** Language the text is in: the one chosen in "Translate to". */
  lang: string;
  /** The suggested text, trimmed. */
  text: string;
  /** Set when the string came from an attribute mapping, e.g. 'placeholder'. */
  attribute: string | null;
  /** Whether the string was edited as HTML. */
  html: boolean;
  /** Language of the text that was clicked, as the page declares it. */
  pageLang: string;
  /** The configured source language. */
  sourceLang: string;
  /** The text before editing, in `pageLang`. */
  original: string;
  /** The visitor's optional comment. */
  comment: string;
  /** Page the suggestion was made on, without the fragment (#…). */
  url: string;
  /** Anything else `buildPayload` added. */
  [extra: string]: unknown;
}

/** A backend reply, or what a `submit` function resolves to. */
export interface SubmitResponse {
  ok?: boolean;
  /** Shown to the visitor. */
  message?: string | null;
  /** The text as stored, if the backend changed it (e.g. sanitised HTML); used for the in-place update. */
  text?: string;
  [extra: string]: unknown;
}

/** The normalised result given to `onSubmit` / `onError`. */
export interface SubmitResult extends SubmitResponse {
  ok: boolean;
  message: string | null;
  /** Parsed response body when `submitUrl` was used. */
  data?: unknown;
  /** HTTP status when `submitUrl` was used. */
  status?: number;
  /** True in local mode (no `submitUrl` and no `submit`). */
  local?: boolean;
  /** The thrown error, when the request failed. */
  error?: unknown;
}

export interface PrefillContext {
  key: string;
  attribute: string | null;
  element: Element | null;
  pageLang: string;
  targetLang: string;
  current: string;
  existing: string | null;
  original: string | null;
}

/** Given to an `updateInPlace` function after every submit. */
export interface UpdateContext {
  /** Elements showing this string in the edited language. Empty when `lang` isn't the page's language. */
  elements: Element[];
  key: string;
  attribute: string | null;
  /** The text to show: what the backend stored if it returned `text`, else what was typed. */
  text: string;
  html: boolean;
  lang: string;
  pageLang: string;
  /** Whether the backend accepted the suggestion (true in local mode). */
  ok: boolean;
  result: SubmitResult;
}

export interface Options {
  // What is translatable
  /** REQUIRED. Attribute holding the translation key, e.g. 'data-i18n'. */
  keyAttribute: string;
  /** Attribute mapping element attributes to keys, e.g. 'data-i18n-attr' with "placeholder:form.email; title:form.tip". */
  attrMapAttribute?: string | null;
  /** Attribute your app sets when it rendered a fallback, e.g. 'data-i18n-missing'. */
  missingAttribute?: string | null;
  /** Elements matching this selector (or inside one) are not highlighted, listed or editable. */
  ignoreSelector?: string | null;
  /** Return false to exclude an individual string. */
  canEdit?: ((element: Element, key: string, attribute: string | null) => boolean) | null;
  /** Offer URL attributes (href, src, action …) from `attrMapAttribute` for editing. Default false. */
  allowUrlAttributes?: boolean;

  // Languages
  /** REQUIRED. Language present on the page when nothing else says otherwise. */
  defaultLanguage: string;
  /** Attribute holding the language of an element (ancestors are searched). */
  langAttribute?: string | null;
  /** Fall back to the nearest standard `lang` attribute. Default true. */
  useLangAttribute?: boolean;
  /** Language your strings are authored in. Defaults to `defaultLanguage`. */
  sourceLanguage?: string | null;
  /** Languages offered in "Translate to". */
  languages?: Array<string | Language> | null;
  /** Pre-select the last language chosen. Default true. */
  rememberLanguage?: boolean;

  // Interaction
  /** 'shift+click', 'alt+click', 'mod+click', 'click', … or a predicate. Default 'shift+click'. */
  trigger?: string | ((event: MouseEvent) => boolean);
  /** Opens the editor for the focused (or hovered) text, e.g. 'shift+f2'. false disables. Default 'shift+f2'. */
  hotkey?: string | false | null;
  /** Press-and-hold on touch screens opens the editor. Default true. */
  longPress?: boolean;
  /** Milliseconds to hold. Default 550. */
  longPressDelay?: number;
  /** Replaces the generated instruction message. */
  message?: string | null;
  /** When to show the instruction message. Default 'session'. */
  showMessage?: 'always' | 'session' | 'once' | false;

  // Editor
  /** What goes in the text box. Default 'current'. */
  prefill?: 'current' | 'blank' | 'target' | ((context: PrefillContext) => string);
  /** Let visitors edit markup. Default false. */
  allowHtml?: boolean | ((element: Element | null, key: string) => boolean);
  /** Show the translation key. Default false. */
  showKey?: boolean;
  /** Suggestions go to a reviewer (default true). false: your backend applies them directly; no comment box. */
  review?: boolean;
  /** Show the optional comment box (only when `review` is true and not in local mode). Default true. */
  showComment?: boolean;
  /** Placeholders to check for; null disables the check. */
  placeholderPattern?: RegExp | null;
  /** Show a character counter and refuse longer suggestions (counted in code points). */
  maxLength?: number | null;
  /** Raw strings (templates) from your app; return null when there is no translation. */
  getSource?: ((key: string, lang: string) => string | null | undefined | Promise<string | null | undefined>) | null;

  // Submitting
  /** URL that receives suggestions. With neither this nor `submit`, changes are applied to the page only. */
  submitUrl?: string | null;
  /** Used instead of the built-in fetch. */
  submit?: ((payload: Payload) => SubmitResponse | string | boolean | void | Promise<SubmitResponse | string | boolean | void>) | null;
  /** HTTP method; must allow a request body (not GET or HEAD). Default 'POST'. */
  method?: string;
  /** Request body encoding. Default 'json'. */
  encoding?: 'json' | 'form';
  /** Extra request headers, e.g. a CSRF token. */
  headers?: Record<string, string> | ((payload: Payload) => Record<string, string> | Promise<Record<string, string>>) | null;
  /** Passed to fetch. Default 'same-origin'. */
  credentials?: RequestCredentials;
  /** Add or change payload fields. */
  buildPayload?: ((payload: Payload, context: { element: Element | null }) => Payload | Promise<Payload>) | null;
  /**
   * 'always': change the page whatever the backend answers (default). 'success' (or true): only when it
   * answers ok. false: never. A function does it itself and is called for every applied suggestion.
   */
  updateInPlace?: 'always' | 'success' | boolean | ((context: UpdateContext) => void | false);
  /** Attribute set on text the visitor has suggested this session; null disables. Default 'data-kth-suggested'. */
  suggestedAttribute?: string | null;
  /** Milliseconds to show the success message before closing; 0 keeps the editor open. Default 1200. */
  closeDelay?: number;

  // Persistence
  /** Where "translation mode is on" is remembered. Default 'localStorage'. */
  persist?: 'localStorage' | 'sessionStorage' | 'cookie' | false;
  /** Prefix for storage keys and the cookie name. Default 'kTranslationHelper'. */
  storageKey?: string;
  /** Cookie lifetime in days; null is a session cookie. */
  cookieDays?: number | null;
  /** Turn on at page load if it was on before. Default true. */
  autoActivate?: boolean;

  // Interface
  showBadge?: boolean;
  showPick?: boolean;
  showList?: boolean;
  /** The Help button on the badge (legend and how it works). Default true. */
  showHelp?: boolean;
  /** Interface text overrides. */
  strings?: Partial<Strings>;
  /** Language of `strings` (BCP 47), set on the plugin's UI so it is pronounced correctly. Default 'en'. */
  uiLanguage?: string;
  /** 'auto' follows the page's color-scheme, then the OS setting. Default 'auto'. */
  theme?: 'auto' | 'light' | 'dark';
  /** z-index of the badge. */
  zIndex?: number;
  /** CSP nonce for the plugin's <style> elements. Defaults to the nonce of the <script> that loaded it. */
  nonce?: string | null;

  // Events (`this` is the helper)
  onActivate?: ((this: TranslationHelper, info: { auto: boolean }) => void) | null;
  onDeactivate?: ((this: TranslationHelper) => void) | null;
  onOpen?: ((this: TranslationHelper, info: { key: string; attribute: string | null; element: Element | null; lang: string }) => void) | null;
  onClose?: ((this: TranslationHelper) => void) | null;
  /** Return false to cancel. */
  onBeforeSubmit?: ((this: TranslationHelper, payload: Payload) => boolean | void) | null;
  onSubmit?: ((this: TranslationHelper, result: SubmitResult, payload: Payload) => void) | null;
  onError?: ((this: TranslationHelper, errorOrResult: unknown, payload: Payload) => void) | null;
}

export type OpenTarget = Element | { key: string; attribute?: string | null; element?: Element | null };

export declare class TranslationHelper {
  constructor(options: Options);
  readonly config: Required<Options>;
  readonly strings: Strings;
  readonly id: number;
  isActive(): boolean;
  activate(options?: { auto?: boolean }): this;
  deactivate(): this;
  toggle(force?: boolean): this;
  /** Arm "pick" mode: the next click on translatable text opens the editor. */
  pick(): this;
  /** Open the editor for an element, or for { key, attribute?, element? }. */
  open(target: OpenTarget): this;
  /** Show the list of all translatable text on the page. */
  list(): this;
  /** Show the help dialog: legend and how translation mode works with this configuration. */
  help(): this;
  close(): this;
  /** Forget cached strings from getSource. */
  clearCache(): this;
  /** Deactivate and remove everything the plugin added. */
  destroy(): void;
}

export interface KTranslationHelper {
  readonly version: string;
  /** Default options (live object). */
  readonly defaults: Readonly<Partial<Options>>;
  /** Default (English) interface text. */
  readonly strings: Readonly<Strings>;
  init(options: Options): TranslationHelper;
  TranslationHelper: typeof TranslationHelper;
}

export declare const kTranslationHelper: KTranslationHelper;
export default kTranslationHelper;

declare global {
  interface Window {
    /** Set by the classic script build (dist/ktranslationhelper.js). */
    kTranslationHelper: KTranslationHelper;
  }
}
