app.config(function($stateProvider) {
    $stateProvider.state('meals', {
        url: '/meals',
        templateUrl: 'js/meals/meals.html',
        controller: 'MealsCtrl',
        resolve: {
            currentUser: function(AuthService){
                return AuthService.getLoggedInUser();
            }
        },
        data: {
            authenticate: true
        }
    });
});

app.controller('MealsCtrl', function($scope, MealFactory, $mdDialog, $log, $state, currentUser, $mdMedia) {

    $scope.meals = [];
    $scope.selectedMeals = [];

    $scope.$watch(function() { return $mdMedia('xs'); }, function(small) {
         $scope.smallScreen = small;
    });


    //select meals
    $scope.selectMeal = function(meal) {
        let chosenIds = $scope.selectedMeals.map(meal => meal.id);
        if (!chosenIds.includes(meal.id)) {
            $scope.selectedMeals.push(meal);
        }
    }

    $scope.addFavorite = function(meal){
        MealFactory.addFavorite(currentUser.id, meal.id)
        .catch($log.error);
    }


    //popup to show a recipe's detail
    $scope.showRecipe = function(meal, ev) {
        $mdDialog.show({
            controller: DialogController,
            scope: $scope, // use parent scope in template
            preserveScope: true,
            templateUrl: 'js/meals/recipe.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        })

        function DialogController($scope, $mdDialog) {
            $scope.meal = meal;

            $scope.formatInstructions = (instructions) => {
                return instructions.split('.');
            };

            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

        }
    };

    const buttonsA = [{
          icon: 'add',
          click: $scope.selectMeal,
          tooltip: "Add to Groceries"
        },
        {
          icon: 'favorite',
          click: $scope.addFavorite,
          tooltip: "Add to Favorites"
        },
        {
          icon: 'aspect_ratio',
          click: $scope.showRecipe,
          tooltip: 'Show Full Recipe'
    }];

    const buttonsB = [
        {
          icon: 'favorite',
          click: $scope.addFavorite,
          tooltip: "Add to Favorites"
        },
        {
          icon: 'aspect_ratio',
          click: $scope.showRecipe,
          tooltip: 'Show Full Recipe'
    }];

    //fetch meals to display on page load
    MealFactory.getMealPlan(currentUser.id)
    .then(function(meals) {
        $scope.meals = meals;
        //change display depending on whether meals are user-selected
        if (meals.length < 10) {
            $scope.showSlider = false;
        //this view has fewer buttons on card
        $scope.buttons = buttonsB;

        } else {
            $scope.showSlider = true;
            $scope.buttons = buttonsA;

        }
    })
    .then(function() {
        $scope.mealsLoaded = true;
    })
    .catch($log.error);

    //Fetch a fresh set of meals
    $scope.refreshMeals = function(){
        //prevent slick jankyness
        $scope.mealsLoaded = false;
        $scope.selectedMeals = [];
         MealFactory.refreshMeals(currentUser.id)
        .then(function(meals) {
            $scope.meals = meals;
        })
        .then(function() {
            $scope.mealsLoaded = true;
            $scope.showSlider = true;

            $scope.buttons = buttonsA;
        })
        .catch($log.error);
    }

    //slick functionality
    $scope.slickConfig = {
        // adaptiveHeight: true,
        // mobileFirst: true,
        slidesToScroll: 1,
        slideToShow: 1,
        method: {}
    }


    $scope.removeMeal = function(mealId) {
        $scope.selectedMeals.forEach((meal, i) => {
            if (meal.id === mealId) {
                $scope.selectedMeals.splice(i, 1);
            }
        })
    }

    $scope.addGroceries = function() {
        MealFactory.addMealPlan(currentUser.id, $scope.selectedMeals)
            .then(function() {
                $state.go('groceries');
            })
            .catch($log.error)
    }

});


app.factory('MealFactory', function($http) {

    let MealFactory = {};

    MealFactory.getMealPlan = function(userId) {
        return $http.get(`api/users/${userId}/meals`)
            .then(function(response) {
                return response.data;
            });
    };

    MealFactory.addMealPlan = function(userId, mealPlan) {
        let mealIds = mealPlan.map(meal => meal.id);
        return $http.post(`api/users/${userId}/meals`, { mealPlan: mealIds });
    }

    MealFactory.refreshMeals = function(userId) {
        return $http.put(`api/users/${userId}/meals`)
        .then(function(response) {
                return response.data;
        });
    }

    MealFactory.addFavorite = function(userId, recipeId){
        return $http.post(`api/users/${userId}/favorites/${recipeId}`)
    }

    return MealFactory;
});