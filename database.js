// إدارة قاعدة البيانات SQLite باستخدام SQL.js
// قاعدة البيانات تُحفظ في IndexedDB للمتصفح

let db = null;
let SQL = null;
const DB_NAME = "mylink_db";
const DB_VERSION = 1;
const STORE_NAME = "sqlite_db";

// تهيئة SQL.js
async function initSQL() {
  if (SQL) return SQL;
  
  try {
    // انتظار تحميل SQL.js من CDN
    if (typeof initSqlJs === "undefined") {
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (typeof initSqlJs !== "undefined") {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    SQL = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
    });
    return SQL;
  } catch (error) {
    console.error("خطأ في تحميل SQL.js:", error);
    throw error;
  }
}

// فتح IndexedDB وحفظ/تحميل قاعدة البيانات
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// حفظ قاعدة البيانات في IndexedDB
async function saveDatabase() {
  if (!db) return;
  
  try {
    const data = db.export();
    const buffer = data.buffer;
    const idb = await openIndexedDB();
    const tx = idb.transaction([STORE_NAME], "readwrite");
    await tx.objectStore(STORE_NAME).put(buffer, "db");
    await tx.complete;
  } catch (error) {
    console.error("خطأ في حفظ قاعدة البيانات:", error);
  }
}

// تحميل قاعدة البيانات من IndexedDB
async function loadDatabase() {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("db");
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const buffer = request.result;
        resolve(buffer);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.log("لا توجد قاعدة بيانات محفوظة، سيتم إنشاء واحدة جديدة");
    return null;
  }
}

// إنشاء الجداول
function createTables() {
  if (!db) return;
  
  try {
    // جدول الروابط
    db.run(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // جدول التاجز
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);
    
    // جدول ربط الروابط بالتاجز
    db.run(`
      CREATE TABLE IF NOT EXISTS link_tags (
        link_id INTEGER NOT NULL,
        tag_name TEXT NOT NULL,
        PRIMARY KEY (link_id, tag_name),
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
      )
    `);
    
    saveDatabase();
  } catch (error) {
    console.error("خطأ في إنشاء الجداول:", error);
  }
}

// تهيئة قاعدة البيانات
async function initDatabase() {
  try {
    SQL = await initSQL();
    const buffer = await loadDatabase();
    
    if (buffer) {
      db = new SQL.Database(new Uint8Array(buffer));
    } else {
      db = new SQL.Database();
      createTables();
      // إدراج البيانات الأولية
      await seedInitialData();
    }
    
    return db;
  } catch (error) {
    console.error("خطأ في تهيئة قاعدة البيانات:", error);
    throw error;
  }
}

// إدراج البيانات الأولية من LINKS_DATA
async function seedInitialData() {
  if (!db) return;
  
  try {
    // التحقق من وجود بيانات
    const check = db.exec("SELECT COUNT(*) as count FROM links");
    if (check.length > 0 && check[0].values[0][0] > 0) {
      return; // البيانات موجودة بالفعل
    }
    
    // إدراج البيانات الأولية
    if (typeof LINKS_DATA !== "undefined" && Array.isArray(LINKS_DATA)) {
      for (const item of LINKS_DATA) {
        const stmt = db.prepare(`
          INSERT INTO links (id, title, description, url, category)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run([
          item.id,
          item.title,
          item.description || "",
          item.url,
          item.category || "غير مصنّف",
        ]);
        stmt.free();
        
        // إدراج التاجز
        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            const tagStmt = db.prepare(`
              INSERT OR IGNORE INTO link_tags (link_id, tag_name)
              VALUES (?, ?)
            `);
            tagStmt.run([item.id, tag]);
            tagStmt.free();
          }
        }
      }
      
      saveDatabase();
    }
  } catch (error) {
    console.error("خطأ في إدراج البيانات الأولية:", error);
  }
}

// ========== عمليات CRUD ==========

// CREATE - إضافة رابط جديد
async function createLink(linkData) {
  if (!db) await initDatabase();
  
  try {
    const { title, description, url, category, tags } = linkData;
    
    const stmt = db.prepare(`
      INSERT INTO links (title, description, url, category)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run([title, description || "", url, category || "غير مصنّف"]);
    stmt.free();
    
    const result = db.exec("SELECT last_insert_rowid() as id");
    const linkId = result[0].values[0][0];
    
    // إضافة التاجز
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        const tagStmt = db.prepare(`
          INSERT OR IGNORE INTO link_tags (link_id, tag_name)
          VALUES (?, ?)
        `);
        tagStmt.run([linkId, tag.trim()]);
        tagStmt.free();
      }
    }
    
    await saveDatabase();
    return linkId;
  } catch (error) {
    console.error("خطأ في إضافة الرابط:", error);
    throw error;
  }
}

// READ - قراءة جميع الروابط
async function getAllLinks() {
  if (!db) await initDatabase();
  
  try {
    const result = db.exec(`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.url,
        l.category,
        GROUP_CONCAT(lt.tag_name, ',') as tags
      FROM links l
      LEFT JOIN link_tags lt ON l.id = lt.link_id
      GROUP BY l.id
      ORDER BY l.id DESC
    `);
    
    if (result.length === 0) return [];
    
    return result[0].values.map((row) => {
      const tags = row[5] ? row[5].split(",").filter(Boolean) : [];
      return {
        id: row[0],
        title: row[1],
        description: row[2] || "",
        url: row[3],
        category: row[4] || "غير مصنّف",
        tags: tags,
      };
    });
  } catch (error) {
    console.error("خطأ في قراءة الروابط:", error);
    return [];
  }
}

// READ - قراءة رابط واحد
async function getLinkById(id) {
  if (!db) await initDatabase();
  
  try {
    const stmt = db.prepare(`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.url,
        l.category,
        GROUP_CONCAT(lt.tag_name, ',') as tags
      FROM links l
      LEFT JOIN link_tags lt ON l.id = lt.link_id
      WHERE l.id = ?
      GROUP BY l.id
    `);
    stmt.bind([id]);
    
    const result = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const tags = row.tags ? row.tags.split(",").filter(Boolean) : [];
      result.push({
        id: row.id,
        title: row.title,
        description: row.description || "",
        url: row.url,
        category: row.category || "غير مصنّف",
        tags: tags,
      });
    }
    
    stmt.free();
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("خطأ في قراءة الرابط:", error);
    return null;
  }
}

// UPDATE - تحديث رابط
async function updateLink(id, linkData) {
  if (!db) await initDatabase();
  
  try {
    const { title, description, url, category, tags } = linkData;
    
    const stmt = db.prepare(`
      UPDATE links
      SET title = ?, description = ?, url = ?, category = ?
      WHERE id = ?
    `);
    stmt.run([title, description || "", url, category || "غير مصنّف", id]);
    stmt.free();
    
    // حذف التاجز القديمة وإضافة الجديدة
    const deleteTagsStmt = db.prepare(`
      DELETE FROM link_tags WHERE link_id = ?
    `);
    deleteTagsStmt.run([id]);
    deleteTagsStmt.free();
    
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        const tagStmt = db.prepare(`
          INSERT OR IGNORE INTO link_tags (link_id, tag_name)
          VALUES (?, ?)
        `);
        tagStmt.run([id, tag.trim()]);
        tagStmt.free();
      }
    }
    
    await saveDatabase();
    return true;
  } catch (error) {
    console.error("خطأ في تحديث الرابط:", error);
    throw error;
  }
}

// DELETE - حذف رابط
async function deleteLink(id) {
  if (!db) await initDatabase();
  
  try {
    // حذف التاجز أولاً (CASCADE سيتعامل معها تلقائياً لكن نضمن الحذف)
    const deleteTagsStmt = db.prepare(`
      DELETE FROM link_tags WHERE link_id = ?
    `);
    deleteTagsStmt.run([id]);
    deleteTagsStmt.free();
    
    // حذف الرابط
    const stmt = db.prepare("DELETE FROM links WHERE id = ?");
    stmt.run([id]);
    stmt.free();
    
    await saveDatabase();
    return true;
  } catch (error) {
    console.error("خطأ في حذف الرابط:", error);
    throw error;
  }
}

// البحث في الروابط
async function searchLinks(searchTerm, categoryFilter = null) {
  if (!db) await initDatabase();
  
  try {
    let query = `
      SELECT 
        l.id,
        l.title,
        l.description,
        l.url,
        l.category,
        GROUP_CONCAT(lt.tag_name, ',') as tags
      FROM links l
      LEFT JOIN link_tags lt ON l.id = lt.link_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (categoryFilter && categoryFilter !== "الكل") {
      query += " AND l.category = ?";
      params.push(categoryFilter);
    }
    
    if (searchTerm && searchTerm.trim()) {
      query += ` AND (
        l.title LIKE ? OR 
        l.description LIKE ? OR 
        l.category LIKE ? OR
        lt.tag_name LIKE ?
      )`;
      const searchPattern = `%${searchTerm.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    query += " GROUP BY l.id ORDER BY l.id DESC";
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const result = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const tags = row.tags ? row.tags.split(",").filter(Boolean) : [];
      result.push({
        id: row.id,
        title: row.title,
        description: row.description || "",
        url: row.url,
        category: row.category || "غير مصنّف",
        tags: tags,
      });
    }
    
    stmt.free();
    return result;
  } catch (error) {
    console.error("خطأ في البحث:", error);
    return [];
  }
}

// الحصول على جميع التصنيفات
async function getAllCategories() {
  if (!db) await initDatabase();
  
  try {
    const result = db.exec(`
      SELECT DISTINCT category FROM links ORDER BY category
    `);
    
    if (result.length === 0) return [];
    
    return result[0].values.map((row) => row[0]).filter(Boolean);
  } catch (error) {
    console.error("خطأ في قراءة التصنيفات:", error);
    return [];
  }
}

// تصدير قاعدة البيانات كملف
async function exportDatabase() {
  if (!db) await initDatabase();
  
  try {
    const data = db.export();
    const buffer = data.buffer;
    return buffer;
  } catch (error) {
    console.error("خطأ في تصدير قاعدة البيانات:", error);
    throw error;
  }
}

// استيراد قاعدة البيانات من ملف
async function importDatabase(buffer) {
  try {
    SQL = await initSQL();
    db = new SQL.Database(new Uint8Array(buffer));
    await saveDatabase();
    return true;
  } catch (error) {
    console.error("خطأ في استيراد قاعدة البيانات:", error);
    throw error;
  }
}
