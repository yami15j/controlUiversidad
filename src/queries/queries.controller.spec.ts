import { Test, TestingModule } from '@nestjs/testing';
import { QueriesController } from './queries/queries.controller';

describe('QueriesController', () => {
  let controller: QueriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueriesController],
    }).compile();

    controller = module.get<QueriesController>(QueriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
