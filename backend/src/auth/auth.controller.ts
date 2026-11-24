import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AuthService,
  AuthUserSummary,
  LoginResponse,
  RegisterResponse,
  RoleSummary,
} from './auth.service';
import {
  getRoleLabel,
  normalizeRoleName,
  RoleLabel,
  UserRole,
} from './constants/roles.constants';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface RbacVerificationResponse {
  message: string;
  scope: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    roleLabel: RoleLabel;
    departmentId: string | null;
  };
}

@ApiTags('Auth')
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserSummary> {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ user: AuthUserSummary; redirectTo: string }> {
    return this.authService.getProfileWithRedirect(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Get('roles')
  async listRoles(): Promise<RoleSummary[]> {
    return this.authService.listRoles();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Get('rbac/admin')
  verifyAdminAccess(
    @CurrentUser() user: AuthenticatedUser,
  ): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'admin',
      'Acceso RBAC autorizado para panel Administrativo / Supervisión.',
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_CREW', 'ROLE_ADMIN')
  @Get('rbac/cuadrilla')
  verifyCrewAccess(
    @CurrentUser() user: AuthenticatedUser,
  ): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'cuadrilla',
      'Acceso RBAC autorizado para operaciones de Cuadrilla en campo.',
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_CITIZEN', 'ROLE_ADMIN')
  @Get('rbac/ciudadano')
  verifyCitizenAccess(
    @CurrentUser() user: AuthenticatedUser,
  ): RbacVerificationResponse {
    return this.buildRbacVerificationResponse(
      'ciudadano',
      'Acceso RBAC autorizado para portal Ciudadano.',
      user,
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private buildRbacVerificationResponse(
    scope: string,
    message: string,
    user: AuthenticatedUser,
  ): RbacVerificationResponse {
    const normalizedRole = normalizeRoleName(user.role) ?? UserRole.CITIZEN;
    return {
      message,
      scope,
      user: {
        id: user.id,
        email: user.email,
        role: normalizedRole,
        roleLabel: getRoleLabel(normalizedRole),
        departmentId: user.departmentId,
      },
    };
  }
}
