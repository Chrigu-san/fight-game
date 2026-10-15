import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ground } from './ground';

describe('Ground', () => {
  let component: Ground;
  let fixture: ComponentFixture<Ground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ground]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ground);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
