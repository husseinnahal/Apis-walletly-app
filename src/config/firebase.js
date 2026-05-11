import admin from 'firebase-admin';
import config from './index.js';
import logger from '../utils/logger.js';

let firebaseApp = null;

const initializeFirebase = () => {
    try {
        // Only initialize if it hasn't been initialized yet
        if (admin.apps.length > 0) {
            firebaseApp = admin.app();
            return firebaseApp;
        }

        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
            : null;

        if (!serviceAccount) {
            logger.warn('Firebase Service Account not found. Push notifications will be disabled.');
            return null;
        }

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        logger.info('Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        logger.error('Error initializing Firebase Admin SDK:', {
            error: error.message
        });
        return null;
    }
};

export { initializeFirebase, admin };
