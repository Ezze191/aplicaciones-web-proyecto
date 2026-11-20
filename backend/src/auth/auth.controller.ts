import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthService,
  AuthUserSummary,
  LoginResponse,
  RegisterResponse,
  RoleSummary,
} from './auth.service';
import { RoleLabel, UserRole } from './constants/roles.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { JwtPayload } from './jwt-token.service';

export interface RbacVerificationResponse {
  message: string;
  scope: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    roleLabel: RoleLabel;
    departmentCode: string | null;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: JwtPayload): { message: string } {
    return this.authService.logout(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ user: AuthUserSummary; redirectTo: string }> {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ user: AuthUserSummary; redirectTo: string }> {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Supervisor')
  @Get('roles')
  async listRoles(): Promise<RoleSummary[]> {
    return this.authService.listRoles();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Supervisor')
  @Get('rbac/admin')
  verifyAdminAccess(@CurrentUser() user: JwtPayload): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'admin',
      'Acceso RBAC autorizado para panel Administrativo / Supervisión.',
      user,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Cuadrilla', 'Admin')
  @Get('rbac/cuadrilla')
  verifyCrewAccess(@CurrentUser() user: JwtPayload): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'cuadrilla',
      'Acceso RBAC autorizado para operaciones de Cuadrilla en campo.',
      user,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Ciudadano', 'Admin')
  @Get('rbac/ciudadano')
  verifyCitizenAccess(
    @CurrentUser() user: JwtPayload,
  ): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'ciudadano',
      'Acceso RBAC autorizado para portal Ciudadano.',
      user,
    );
  }

  private buildRbacVerificationResponse(
    scope: string,
    message: string,
    user: JwtPayload,
  ): RbacVerificationResponse {
    return {
      message,
      scope,
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
        roleLabel: user.roleLabel,
        departmentCode: user.departmentCode,
      },
    };
  }
}
