import { TestBed } from '@angular/core/testing';

import { GuessInfoService } from './guess-info.service';

describe('GuessInfoService', () => {
  let service: GuessInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuessInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
