<?php
/**
 * Shared helpers for the writable demo backend.
 *
 * THIS BACKEND IS FOR LOCAL DEVELOPMENT ONLY. It writes whatever visitors submit straight into
 * the translation files. A production backend should store suggestions for review instead
 * (see docs/index.html → "Writing a backend").
 */

declare(strict_types=1);

const LANG_DIR = __DIR__ . '/../lang';
const ORIGINAL_DIR = LANG_DIR . '/original';

/** Languages that may be written. The language code ends up in a file path, so this list is the allowlist. */
const LANGUAGES = ['en', 'es', 'zh-Hans', 'ar', 'fr'];

/** Keys must already exist in this language's file. Stops visitors from inventing keys. */
const SOURCE_LANGUAGE = 'en';

/** Keys whose value may contain (sanitised) HTML. Must match the data-i18n-html elements in the page. */
const HTML_KEYS = ['ex.html.sentence'];

/** Tags and attributes allowed in HTML keys. */
const ALLOWED_TAGS = ['a' => ['href'], 'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'br' => []];

const MAX_LENGTH = 2000;

/**
 * Send a JSON response in the shape kTranslationHelper expects: { ok, message }.
 */
function respond(int $status, bool $ok, string $message, array $extra = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['ok' => $ok, 'message' => $message] + $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Only accept requests from this computer or a private network (Docker, LAN, VM).
 * Set KTH_DEMO_ALLOW_REMOTE=1 to switch this off — but please don't on a public server.
 */
function guard_local(): void
{
    if (getenv('KTH_DEMO_ALLOW_REMOTE') === '1') {
        return;
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $isPublic = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    if ($ip === '' || $isPublic) {
        respond(403, false, 'The writable demo backend only accepts requests from this computer or a private network.');
    }
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        respond(405, false, 'Use POST.');
    }
}

/**
 * Refuse requests made by another website open in the same browser (a form or fetch from any other
 * origin would otherwise write to the files, since the request still comes from this computer).
 * Browsers say where a request came from in `Sec-Fetch-Site`; older ones only in `Origin`. Requests
 * that carry neither (curl, scripts) are allowed, because they are not made by a browser on someone's behalf.
 */
function guard_same_origin(): void
{
    $site = strtolower(trim($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($site !== '' && $site !== 'same-origin') {
        respond(403, false, 'The writable demo backend only accepts requests from its own pages.');
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') { // "null" (sandboxed pages) has no host and is refused too
        $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
        $port = parse_url($origin, PHP_URL_PORT);
        $sent = $host . ($port !== null ? ':' . $port : '');
        if ($host === '' || $sent !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) {
            respond(403, false, 'The writable demo backend only accepts requests from its own pages.');
        }
    }
}

function lang_path(string $lang, string $dir = LANG_DIR): string
{
    if (!in_array($lang, LANGUAGES, true)) {
        throw new InvalidArgumentException('Unknown language.');
    }
    return $dir . '/' . $lang . '.json';
}

/** @return array<string, string> */
function read_translations(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

/**
 * Write a translation file atomically (temp file + rename), keeping keys in the source file's order.
 *
 * @param array<string, string> $data
 * @param array<string, string> $order
 */
function write_translations(string $path, array $data, array $order): void
{
    $sorted = [];
    foreach (array_keys($order) as $k) {
        if (array_key_exists($k, $data)) {
            $sorted[$k] = $data[$k];
        }
    }
    $sorted += $data;

    $json = json_encode(
        $sorted === [] ? new stdClass() : $sorted,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    ) . "\n";

    $tmp = $path . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $json) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Could not write ' . basename($path) . '. Is demo/lang writable?');
    }
}

/**
 * Run $fn while holding an exclusive lock, so simultaneous saves can't overwrite each other.
 */
function with_lock(callable $fn): mixed
{
    $fh = fopen(LANG_DIR . '/.lock', 'c');
    if ($fh === false || !flock($fh, LOCK_EX)) {
        throw new RuntimeException('Could not lock the translation files.');
    }
    try {
        return $fn();
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/**
 * Remove everything except a small set of formatting tags, and any link that isn't http(s), mailto,
 * tel, a fragment, a query string or a relative URL.
 */
function sanitize_html(string $html): string
{
    if (!class_exists(DOMDocument::class)) {
        return htmlspecialchars(strip_tags($html), ENT_NOQUOTES, 'UTF-8');
    }
    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML(
        '<?xml encoding="UTF-8"><div>' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET
    );
    libxml_clear_errors();
    libxml_use_internal_errors($prev);

    $root = $doc->getElementsByTagName('div')->item(0);
    if ($root === null) {
        return '';
    }
    clean_node($root);

    $out = '';
    foreach (iterator_to_array($root->childNodes) as $child) {
        $out .= $doc->saveHTML($child);
    }
    return trim($out);
}

function clean_node(DOMNode $node): void
{
    foreach (iterator_to_array($node->childNodes) as $child) {
        if ($child instanceof DOMText) {
            continue;
        }
        if (!$child instanceof DOMElement) {
            $node->removeChild($child); // comments, processing instructions …
            continue;
        }
        $tag = strtolower($child->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math'], true)) {
            $node->removeChild($child);
            continue;
        }
        clean_node($child);
        if (!array_key_exists($tag, ALLOWED_TAGS)) {
            // Unknown tag: keep its text, drop the tag.
            while ($child->firstChild) {
                $node->insertBefore($child->firstChild, $child);
            }
            $node->removeChild($child);
            continue;
        }
        foreach (iterator_to_array($child->attributes) as $attr) {
            $name = strtolower($attr->name);
            $keep = in_array($name, ALLOWED_TAGS[$tag], true);
            if ($keep && $name === 'href') {
                $href = trim($attr->value);
                // Absolute http(s), mailto:, tel:, a fragment, a query string, a root-relative path (not
                // protocol-relative "//host"), or a relative path: a first segment with no scheme colon.
                $keep = (bool) preg_match('~^(https?://|mailto:|tel:|#|\?|/(?!/)|\./|\.\./)~i', $href)
                    || (bool) preg_match('~^[^:/?#]+([/?#]|$)~', $href);
            }
            if (!$keep) {
                $child->removeAttribute($attr->name);
            }
        }
    }
}
