<?php
/**
 * Writable demo backend for kTranslationHelper.
 *
 * Receives a suggestion from the plugin and writes it straight into docs/lang/<lang>.json.
 * FOR LOCAL DEVELOPMENT ONLY — see lib.php.
 *
 * Request (JSON, as sent by the plugin with encoding: 'json'):
 *   { "key": "ex.text.item1", "lang": "es", "text": "…", "attribute": null, "html": false,
 *     "pageLang": "es", "sourceLang": "en", "original": "…", "comment": "", "url": "…" }
 *
 * Response:
 *   200 { "ok": true,  "message": "Saved …" }
 *   4xx { "ok": false, "message": "Why it was refused" }
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

require_post();
guard_local();
guard_same_origin();

// Accept JSON bodies (the plugin default) and form posts (encoding: 'form').
$input = $_POST;
if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
    $raw = file_get_contents('php://input', false, null, 0, 64 * 1024);
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        respond(400, false, 'The request body is not valid JSON.');
    }
}

$key = $input['key'] ?? null;
$lang = $input['lang'] ?? null;
$text = $input['text'] ?? null;

if (!is_string($key) || !preg_match('/^[A-Za-z0-9_.-]{1,128}$/', $key)) {
    respond(422, false, 'Invalid translation key.');
}
if (!is_string($lang) || !in_array($lang, LANGUAGES, true)) {
    respond(422, false, 'That language is not available in this demo.');
}
if (!is_string($text) || !mb_check_encoding($text, 'UTF-8')) {
    respond(422, false, 'Invalid text.');
}

// Normalise the text: strip control characters (keep tab and newline), trim, check length.
$text = trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text));
if ($text === '') {
    respond(422, false, 'The translation is empty.');
}
if (mb_strlen($text) > MAX_LENGTH) {
    respond(422, false, 'The translation is too long.');
}

// HTML is only allowed for keys that are rendered as HTML, and is sanitised.
// Every other key is rendered with textContent by the demo, so it is stored as typed.
if (in_array($key, HTML_KEYS, true)) {
    $text = sanitize_html($text);
    if ($text === '') {
        respond(422, false, 'The translation is empty after removing unsupported HTML.');
    }
}

// Checked before taking the lock: respond() exits, and PHP does not run `finally` blocks on exit,
// so nothing that can refuse the request may run inside with_lock().
$source = read_translations(lang_path(SOURCE_LANGUAGE));
if (!array_key_exists($key, $source)) {
    respond(404, false, 'Unknown translation key.');
}

try {
    $saved = with_lock(function () use ($key, $lang, $text, $source) {
        $path = lang_path($lang);
        $data = read_translations($path);
        $previous = $data[$key] ?? null;
        $data[$key] = $text;
        write_translations($path, $data, $source);
        return ['previous' => $previous];
    });
} catch (Throwable $e) {
    respond(500, false, $e->getMessage());
}

respond(200, true, $saved['previous'] === null
    ? 'Saved! The new translation has been added.'
    : 'Saved! The translation has been updated.', ['text' => $text]);
