<?php
require_once __DIR__ . '/db.php';

function getUserId($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $token, $matches)) {
        $token = $matches[1];
    } else {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE session_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    return $user ? $user['id'] : null;
}
?>