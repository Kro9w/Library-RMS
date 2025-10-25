// apps/api/src/firebase/firebase-admin.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth'; // <-- ADD THIS IMPORT
import { env } from '../env';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private _app: App;

  onModuleInit() {
    const serviceAccountJson = Buffer.from(
      env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      'base64',
    ).toString('ascii');
    
    const serviceAccount = JSON.parse(serviceAccountJson);

    this._app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  get app(): App {
    return this._app;
  }

  get auth() {
    return getAuth(this.app); // <-- CHANGE THIS LINE
  }
}