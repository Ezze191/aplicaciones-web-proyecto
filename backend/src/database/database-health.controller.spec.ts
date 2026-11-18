import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseHealthController } from './database-health.controller';

describe('DatabaseHealthController', () => {
  it('returns ok status with PostGIS version when extension is enabled', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([
        {
          database: 'siu_db',
          user_name: 'postgres',
          postgis_enabled: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          postgis_version: '3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1',
        },
      ]);

    const controller = new DatabaseHealthController({
      query: queryMock,
    } as unknown as DataSource);

    await expect(controller.checkDatabase()).resolves.toEqual({
      status: 'ok',
      database: 'siu_db',
      user: 'postgres',
      postgisEnabled: true,
      postgisVersion: '3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1',
    });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('returns postgisEnabled=false without calling PostGIS_Version when disabled', async () => {
    const queryMock = jest.fn().mockResolvedValueOnce([
      {
        database: 'siu_db',
        user_name: 'postgres',
        postgis_enabled: false,
      },
    ]);

    const controller = new DatabaseHealthController({
      query: queryMock,
    } as unknown as DataSource);

    await expect(controller.checkDatabase()).resolves.toEqual({
      status: 'ok',
      database: 'siu_db',
      user: 'postgres',
      postgisEnabled: false,
      postgisVersion: null,
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException when database query fails', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'));

    const controller = new DatabaseHealthController({
      query: queryMock,
    } as unknown as DataSource);

    await expect(controller.checkDatabase()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
