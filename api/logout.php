<?php
require_once 'db.php';
require_once 'auth_check.php';

$userId = getUserId($pdo);
if ($userId) {
    $stmt = $pdo->prepare('UPDATE users SET session_token = NULL WHERE id = ?');
    $stmt->execute([$userId]);
}
echo json_encode(['success' => true]);
?>