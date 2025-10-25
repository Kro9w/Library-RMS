// apps/api/src/firebase/firebase-admin.module.ts
import { Module, Global } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';

@Global() // Make this service available globally
@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}