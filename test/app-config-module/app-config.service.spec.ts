import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../src/app-config-module/services/app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string): any => {
              if (key === 'TARGET_SERVER_URL') return 'http://test-server:3000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
