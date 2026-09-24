<?php
/**
 * Restore docs/lang/*.json from docs/lang/original/.
 *
 *   From the page:   the "Reset translations" button (PHP backend only) POSTs here.
 *   From a terminal: php docs/backend/reset.php
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    require_post();
    guard_local();
    guard_same_origin();
}

try {
    with_lock(function () {
        foreach (LANGUAGES as $lang) {
            $from = lang_path($lang, ORIGINAL_DIR);
            if (!is_file($from)) {
                continue;
            }
            $to = lang_path($lang);
            $tmp = $to . '.tmp-' . bin2hex(random_bytes(4));
            if (!copy($from, $tmp) || !rename($tmp, $to)) {
                @unlink($tmp);
                throw new RuntimeException("Could not restore $lang.json");
            }
        }
    });
} catch (Throwable $e) {
    if ($cli) {
        fwrite(STDERR, $e->getMessage() . "\n");
        exit(1);
    }
    respond(500, false, $e->getMessage());
}

if ($cli) {
    echo "Translations restored from docs/lang/original/\n";
    exit(0);
}
respond(200, true, 'The translation files have been reset.');
