import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login met email en wachtwoord' })
  @ApiResponse({ status: 200, description: 'Login succesvol' })
  @ApiResponse({ status: 401, description: 'Ongeldige inloggegevens' })
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto);
  }
} 
