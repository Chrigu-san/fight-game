import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fighter } from './fighter';

describe('Fighter', () => {
  let component: Fighter;
  let fixture: ComponentFixture<Fighter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fighter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fighter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
