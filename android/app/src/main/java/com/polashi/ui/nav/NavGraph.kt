package com.polashi.ui.nav

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.polashi.game.GameViewModel
import com.polashi.ui.screens.HomeScreen
import com.polashi.ui.screens.LobbyScreen
import com.polashi.ui.screens.LoginScreen
import com.polashi.ui.screens.SplashScreen

object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val HOME = "home"
    const val GAME = "game" // Lobby + in-game; driven by PlayerView.status
}

/**
 * Pre-game navigation is explicit (splash/login/home). Once a room exists, a single GAME
 * destination renders by PlayerView.status (Lobby -> RoleReveal -> Board -> ... -> Result).
 */
@Composable
fun PolashiNavGraph(vm: GameViewModel) {
    val nav = rememberNavController()
    val view by vm.view.collectAsState()

    // When a room appears (joined/created), jump into the game flow.
    LaunchedEffect(view?.roomId) {
        if (view != null) nav.navigate(Routes.GAME)
    }

    NavHost(navController = nav, startDestination = Routes.SPLASH) {
        composable(Routes.SPLASH) { SplashScreen(onDone = { nav.navigate(Routes.LOGIN) }) }
        composable(Routes.LOGIN) {
            LoginScreen(vm, onContinue = { nav.navigate(Routes.HOME) })
        }
        composable(Routes.HOME) { HomeScreen(vm) }
        composable(Routes.GAME) { LobbyScreen(vm) } // TODO: GameBoardScreen dispatches by status
    }
}
