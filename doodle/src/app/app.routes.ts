import { Routes } from '@angular/router';
import {MenuComponent} from "./menu/menu.component";

export const routes: Routes = [
  {
    path: 'menu',
    component: MenuComponent
  },
  {
    path: '**',
    redirectTo: 'menu'
  }
];
