import { Routes } from '@angular/router';
import {MenuComponent} from "./menu/menu.component";
import {LobbyComponent} from "./lobby/lobby.component";

export const routes: Routes = [
  {
    path: 'menu',
    component: MenuComponent
  },
  {
    path: 'lobby/:id',
    component: LobbyComponent
  },
  {
    path: '**',
    redirectTo: 'menu'
  }
];
