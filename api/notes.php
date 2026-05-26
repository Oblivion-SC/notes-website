<?php
require_once 'db.php';
require_once 'auth_check.php';

$userId = getUserId($pdo);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Проверяем, является ли запрос к /notes.php/{id}/labels или /notes.php/{id}/labels/{labelId}
if (preg_match('#/notes\.php/(\d+)/labels(?:/(\d+))?#', $requestUri, $matches)) {
    $noteId = (int)$matches[1];
    $labelId = isset($matches[2]) ? (int)$matches[2] : 0;
    
    if ($method === 'POST' && $labelId === 0) {
        // Добавление ярлыка к заметке
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $labelId = isset($data['label_id']) ? (int)$data['label_id'] : 0;
        if (!$labelId) {
            http_response_code(400);
            echo json_encode(['error' => 'ID ярлыка не указан']);
            exit();
        }
        // Проверка, что ярлык принадлежит пользователю
        $stmt = $pdo->prepare('SELECT id FROM labels WHERE id = ? AND user_id = ?');
        $stmt->execute([$labelId, $userId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Ярлык не найден']);
            exit();
        }
        // Проверка, что заметка существует и не удалена
        $stmt = $pdo->prepare('SELECT id FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
        $stmt->execute([$noteId, $userId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Заметка не найдена']);
            exit();
        }
        // Добавляем связь (игнорируем дубликаты)
        $stmt = $pdo->prepare('INSERT IGNORE INTO note_labels (note_id, label_id) VALUES (?, ?)');
        $stmt->execute([$noteId, $labelId]);
        echo json_encode(['success' => true]);
        exit();
    } 
    elseif ($method === 'DELETE' && $labelId > 0) {
        // Удаление ярлыка из заметки
        $stmt = $pdo->prepare('DELETE FROM note_labels WHERE note_id = ? AND label_id = ?');
        $stmt->execute([$noteId, $labelId]);
        echo json_encode(['success' => true]);
        exit();
    } 
    else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit();
    }
}

// Обычные CRUD операции (получение, создание, обновление, удаление)
$noteId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($method === 'GET') {
    if ($noteId) {
        $stmt = $pdo->prepare('SELECT * FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
        $stmt->execute([$noteId, $userId]);
        $note = $stmt->fetch();
        if ($note) {
            $stmtL = $pdo->prepare('SELECT l.id, l.name FROM labels l JOIN note_labels nl ON l.id = nl.label_id WHERE nl.note_id = ?');
            $stmtL->execute([$noteId]);
            $note['labels'] = $stmtL->fetchAll();
            echo json_encode($note);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Заметка не найдена']);
        }
    } else {
        $stmt = $pdo->prepare('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC');
        $stmt->execute([$userId]);
        $notes = $stmt->fetchAll();
        foreach ($notes as &$note) {
            $stmtL = $pdo->prepare('SELECT l.id, l.name FROM labels l JOIN note_labels nl ON l.id = nl.label_id WHERE nl.note_id = ?');
            $stmtL->execute([$note['id']]);
            $note['labels'] = $stmtL->fetchAll();
        }
        echo json_encode($notes);
    }
}
elseif ($method === 'POST') {
    // Создание заметки
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    $title = isset($data['title']) ? $data['title'] : '';
    $content = isset($data['content']) ? $data['content'] : '';
    $labelIds = isset($data['label_ids']) ? $data['label_ids'] : [];
    
    $stmt = $pdo->prepare('INSERT INTO notes (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
    $stmt->execute([$userId, $title, $content]);
    $newId = $pdo->lastInsertId();
    
    if (!empty($labelIds) && is_array($labelIds)) {
        $ins = $pdo->prepare('INSERT INTO note_labels (note_id, label_id) VALUES (?, ?)');
        foreach ($labelIds as $lid) {
            $check = $pdo->prepare('SELECT id FROM labels WHERE id = ? AND user_id = ?');
            $check->execute([$lid, $userId]);
            if ($check->fetch()) {
                $ins->execute([$newId, $lid]);
            }
        }
    }
    echo json_encode(['id' => $newId, 'success' => true]);
}
elseif ($method === 'PUT') {
    if (!$noteId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID заметки не указан']);
        exit();
    }
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (isset($data['restore']) && $data['restore'] === true) {
        // Восстановление из корзины
        $stmt = $pdo->prepare('UPDATE notes SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL');
        $stmt->execute([$noteId, $userId]);
        echo json_encode(['success' => true]);
        exit();
    }
    
    $title = isset($data['title']) ? $data['title'] : '';
    $content = isset($data['content']) ? $data['content'] : '';
    $stmt = $pdo->prepare('UPDATE notes SET title = ?, content = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
    $stmt->execute([$title, $content, $noteId, $userId]);
    echo json_encode(['success' => true]);
}
elseif ($method === 'DELETE') {
    if (!$noteId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID заметки не указан']);
        exit();
    }
    $permanent = isset($_GET['permanent']) && $_GET['permanent'] === 'true';
    if ($permanent) {
        $stmt = $pdo->prepare('DELETE FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL');
        $stmt->execute([$noteId, $userId]);
    } else {
        $stmt = $pdo->prepare('UPDATE notes SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
        $stmt->execute([$noteId, $userId]);
    }
    echo json_encode(['success' => true]);
}
else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>