import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { RegisterUserDto } from './dto/register-user.dto';
import { md5 } from '../utils/utils';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';

@Injectable()
export class UserService {
  @Inject(PrismaService)
  private readonly prismaService: PrismaService;

  @InjectRedis()
  private redisClient: Redis;

  private logger = new Logger();

  async register(user: RegisterUserDto) {
    const captcha = await this.redisClient.get(`captcha_${user.email}`);
    if (!captcha) {
      throw new HttpException('验证码失效', HttpStatus.BAD_REQUEST);
    }
    if (user.captcha !== captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.prismaService.user.findUnique({
      where: {
        username: user.username,
      },
    });
    if (foundUser) {
      throw new HttpException('用户已存在', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.prismaService.user.create({
        data: {
          username: user.username,
          password: md5(user.password),
          nickName: user.nickName,
          email: user.email,
        },
        select: {
          id: true,
          username: true,
          nickName: true,
          email: true,
          headPic: true,
          createTime: true,
        },
      });
    } catch (e) {
      this.logger.error(e, UserService);
      return null;
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const foundUser = await this.prismaService.user.findUnique({
      where: {
        username: loginUserDto.username,
      },
    });

    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    if (foundUser.password !== md5(loginUserDto.password)) {
      throw new HttpException('密码错误', HttpStatus.BAD_REQUEST);
    }

    delete foundUser.password;
    return foundUser;
  }

  async findUserInfoById(userId: number) {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        nickName: true,
        email: true,
        headPic: true,
        createTime: true,
      },
    });
  }

  async updatePassword(passwordDto: UpdateUserPasswordDto) {
    const captcha = await this.redisClient.get(
      `update_password_captcha_${passwordDto.email}`,
    );

    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }

    if (passwordDto.captcha !== captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.prismaService.user.findUnique({
      where: {
        username: passwordDto.username,
      },
    });

    foundUser.password = md5(passwordDto.password);

    try {
      await this.prismaService.user.update({
        where: {
          id: foundUser.id,
        },
        data: foundUser,
      });
      return '密码修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '密码修改失败';
    }
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisClient.get(
      `update_user_captcha_${updateUserDto.email}`,
    );

    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }

    if (updateUserDto.captcha !== captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (updateUserDto.nickName) {
      foundUser.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.headPic) {
      foundUser.headPic = updateUserDto.headPic;
    }

    try {
      await this.prismaService.user.update({
        where: {
          id: userId,
        },
        data: foundUser,
      });
      return '用户信息修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '用户信息修改成功';
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
