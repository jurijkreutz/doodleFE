import { Routes } from '@angular/router';
import {MenuComponent} from "./components/menu/menu.component";
import {LobbyComponent} from "./components/lobby/lobby.component";

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
