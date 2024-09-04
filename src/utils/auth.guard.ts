import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export interface JwtUserData {
  userId: number;
  username: string;
}

declare module 'express' {
  interface Request {
    user: JwtUserData;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  @Inject()
  private reflector: Reflector;

  @Inject(JwtService)
  private jwtService: JwtService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const response: Response = context.switchToHttp().getResponse();

    const requireLogin = this.reflector.getAllAndOverride('require-login', [
      context.getClass(),
      context.getHandler(),
    ]);

    if (!requireLogin) return true;

    const authorization = request.headers.authorization;
    console.log('=>(auth.guard.ts:45) authorization', authorization);

    try {
      const token = authorization.split(' ')[1];
      const data = this.jwtService.verify<JwtUserData>(token);
      const { exp } = data as JwtUserData & { exp: number };
      const now = Date.now() / 1000;
      // 临近一天之内刷新 token并返回
      if (exp - now < 60 * 60 * 24) {
        const newToken = this.jwtService.sign(
          { userId: data.userId, username: data.username },
          {
            expiresIn: '7d',
          },
        );
        response.setHeader('Authorization', `Bearer ${newToken}`);
      }

      request.user = {
        userId: data.userId,
        username: data.username,
      };
      return true;
    } catch (e) {
      throw new UnauthorizedException('token 失效，请重新登录');
    }
  }
}
