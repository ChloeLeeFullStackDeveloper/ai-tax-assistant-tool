const admin = require('firebase-admin');

let db;
let storage;

const initializeFirebase = () => {
  if (process.env.FIREBASE_STORAGE_BUCKET && !admin.apps.length) {
    try {
      const serviceAccount = {
        type: "service_account",
        apiKey: "AIzaSyBOnbuI4W2wduiXEq6_kh83L0HSa6HZLCI",
        authDomain: "ai-tax-assistant-b0b13.firebaseapp.com",
        projectId: "ai-tax-assistant-b0b13",
        storageBucket: "ai-tax-assistant-b0b13.firebasestorage.app",
        messagingSenderId: "916982549193",
        appId: "1:916982549193:web:261549cd12c9f912f95b18",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL?.replace('@', '%40')}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      db = admin.firestore();
      storage = admin.storage();

      console.log('🔥 Firebase initialized successfully');

      return true;
    } catch (error) {
      console.log('⚠️  Firebase initialization failed:', error.message);
      console.log('📝 Using in-memory storage as fallback');
      return false;
    }
  } else {
    console.log('⚠️  Firebase not configured, using in-memory storage');
    return false;
  }
};

// Initialize on module load
const isFirebaseEnabled = initializeFirebase();

const saveUser = async (user) => {
  if (db) {
    try {
      const userDoc = {
        ...user,
        createdAt: admin.firestore.Timestamp.fromDate(user.createdAt || new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      await db.collection('users').doc(user.id).set(userDoc);
      console.log(`💾 User saved to Firebase: ${user.email}`);
      return user;
    } catch (error) {
      console.error('❌ Firebase save user error:', error);
      throw new Error('Failed to save user to database');
    }
  }
  throw new Error('Firebase not available');
};

const findUser = async (criteria) => {
  if (db) {
    try {
      const usersRef = db.collection('users');

      if (criteria.email) {
        const query = usersRef.where('email', '==', criteria.email);
        const snapshot = await query.get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const userData = doc.data();
          return {
            id: doc.id,
            ...userData,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date()
          };
        }
      } else if (criteria.id) {
        const doc = await usersRef.doc(criteria.id).get();

        if (doc.exists) {
          const userData = doc.data();
          return {
            id: doc.id,
            ...userData,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date()
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Firebase find user error:', error);
      throw new Error('Failed to find user in database');
    }
  }
  throw new Error('Firebase not available');
};

const updateUser = async (userId, updates) => {
  if (db) {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      await db.collection('users').doc(userId).update(updateData);
      console.log(`🔄 User updated in Firebase: ${userId}`);

      // Return updated user
      return await findUser({ id: userId });
    } catch (error) {
      console.error('❌ Firebase update user error:', error);
      throw new Error('Failed to update user in database');
    }
  }
  throw new Error('Firebase not available');
};

// ==========================================
// DOCUMENT OPERATIONS
// ==========================================

const saveDocument = async (document) => {
  if (db) {
    try {
      const docData = {
        ...document,
        uploadDate: admin.firestore.Timestamp.fromDate(document.uploadDate || new Date()),
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      await db.collection('documents').doc(document.id).set(docData);
      console.log(`📄 Document saved to Firebase: ${document.name}`);
      return document;
    } catch (error) {
      console.error('❌ Firebase save document error:', error);
      throw new Error('Failed to save document to database');
    }
  }
  throw new Error('Firebase not available');
};

const getUserDocuments = async (userId) => {
  if (db) {
    try {
      const snapshot = await db.collection('documents')
        .where('userId', '==', userId)
        .orderBy('uploadDate', 'desc')
        .get();

      const documents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      console.log(`📋 Retrieved ${documents.length} documents for user: ${userId}`);
      return documents;
    } catch (error) {
      console.error('❌ Firebase get documents error:', error);
      throw new Error('Failed to retrieve documents from database');
    }
  }
  throw new Error('Firebase not available');
};

const deleteDocument = async (documentId, userId) => {
  if (db) {
    try {
      // Verify document belongs to user
      const doc = await db.collection('documents').doc(documentId).get();
      if (!doc.exists || doc.data().userId !== userId) {
        throw new Error('Document not found or access denied');
      }

      await db.collection('documents').doc(documentId).delete();
      console.log(`🗑️ Document deleted from Firebase: ${documentId}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase delete document error:', error);
      throw new Error('Failed to delete document from database');
    }
  }
  throw new Error('Firebase not available');
};

// ==========================================
// TAX FORM OPERATIONS
// ==========================================

const saveTaxForm = async (taxForm) => {
  if (db) {
    try {
      const formData = {
        ...taxForm,
        createdAt: admin.firestore.Timestamp.fromDate(taxForm.createdAt || new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      await db.collection('taxForms').doc(taxForm.id).set(formData);
      console.log(`🧮 Tax form saved to Firebase: ${taxForm.id}`);
      return taxForm;
    } catch (error) {
      console.error('❌ Firebase save tax form error:', error);
      throw new Error('Failed to save tax form to database');
    }
  }
  throw new Error('Firebase not available');
};

const getUserTaxForms = async (userId) => {
  if (db) {
    try {
      const snapshot = await db.collection('taxForms')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const taxForms = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });

      console.log(`📊 Retrieved ${taxForms.length} tax forms for user: ${userId}`);
      return taxForms;
    } catch (error) {
      console.error('❌ Firebase get tax forms error:', error);
      throw new Error('Failed to retrieve tax forms from database');
    }
  }
  throw new Error('Firebase not available');
};

// ==========================================
// CHAT OPERATIONS
// ==========================================

const saveChatMessage = async (chatMessage) => {
  if (db) {
    try {
      const messageData = {
        ...chatMessage,
        timestamp: admin.firestore.Timestamp.fromDate(chatMessage.timestamp || new Date())
      };

      await db.collection('chatHistory').doc(chatMessage.id).set(messageData);
      return chatMessage;
    } catch (error) {
      console.error('❌ Firebase save chat error:', error);
      throw new Error('Failed to save chat message to database');
    }
  }
  throw new Error('Firebase not available');
};

const getUserChatHistory = async (userId, limit = 20) => {
  if (db) {
    try {
      const snapshot = await db.collection('chatHistory')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const chatHistory = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      }).reverse(); // Reverse to get chronological order

      return chatHistory;
    } catch (error) {
      console.error('❌ Firebase get chat history error:', error);
      throw new Error('Failed to retrieve chat history from database');
    }
  }
  throw new Error('Firebase not available');
};

const clearUserChatHistory = async (userId) => {
  if (db) {
    try {
      const snapshot = await db.collection('chatHistory')
        .where('userId', '==', userId)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🗑️ Chat history cleared for user: ${userId}`);
      return snapshot.docs.length;
    } catch (error) {
      console.error('❌ Firebase clear chat history error:', error);
      throw new Error('Failed to clear chat history from database');
    }
  }
  throw new Error('Firebase not available');
};

// ==========================================
// FILE STORAGE OPERATIONS
// ==========================================

const uploadToFirebaseStorage = async (file, userId) => {
  if (storage) {
    try {
      const bucket = storage.bucket();
      const fileName = `documents/${userId}/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            uploadedBy: userId,
            uploadDate: new Date().toISOString()
          }
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('❌ Firebase storage upload error:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileUpload.makePublic();

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            console.log(`☁️ File uploaded to Firebase Storage: ${fileName}`);

            resolve({
              fileName,
              publicUrl,
              bucket: bucket.name,
              path: fileName
            });
          } catch (error) {
            console.error('❌ Firebase storage public access error:', error);
            reject(error);
          }
        });

        stream.end(file.buffer);
      });
    } catch (error) {
      console.error('❌ Firebase storage initialization error:', error);
      throw error;
    }
  }
  throw new Error('Firebase Storage not available');
};

const deleteFromFirebaseStorage = async (filePath) => {
  if (storage) {
    try {
      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      await file.delete();
      console.log(`🗑️ File deleted from Firebase Storage: ${filePath}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase storage delete error:', error);
      throw error;
    }
  }
  throw new Error('Firebase Storage not available');
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const getFirebaseStatus = () => {
  return {
    isEnabled: isFirebaseEnabled,
    hasDatabase: !!db,
    hasStorage: !!storage,
    appName: admin.apps.length > 0 ? admin.apps[0].name : null
  };
};

const testFirebaseConnection = async () => {
  if (db) {
    try {
      await db.collection('_test').doc('connection').set({
        timestamp: admin.firestore.Timestamp.now(),
        status: 'connected'
      });

      await db.collection('_test').doc('connection').delete();
      console.log('✅ Firebase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return false;
    }
  }
  return false;
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Status
  isFirebaseEnabled,
  getFirebaseStatus,
  testFirebaseConnection,

  // User operations
  saveUser,
  findUser,
  updateUser,

  // Document operations
  saveDocument,
  getUserDocuments,
  deleteDocument,

  // Tax form operations
  saveTaxForm,
  getUserTaxForms,

  // Chat operations
  saveChatMessage,
  getUserChatHistory,
  clearUserChatHistory,

  // Storage operations
  uploadToFirebaseStorage,
  deleteFromFirebaseStorage,

  // Direct access to Firebase instances (use carefully)
  admin,
  db,
  storage
};