import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';
import { JwtTokenService } from './jwt-token.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      DepartmentEntity,
      FieldCrewEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '30m');
        return {
          secret: configService.get<string>(
            'JWT_SECRET',
            'siu_torreon_dev_secret_change_me',
          ),
          signOptions: {
            expiresIn: expiresIn as
              | `${number}s`
              | `${number}m`
              | `${number}h`
              | `${number}d`
              | number,
            algorithm: 'HS256',
            issuer: 'siu-torreon-api',
            audience: 'siu-torreon-web',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'siu-torreon-api',
            audience: 'siu-torreon-web',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtTokenService, JwtAuthGuard, RolesGuard],
  exports: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
    TypeOrmModule,
  ],
})
export class AuthModule {}
