'use strict';

const chalk = require('chalk');
const Promise = require('bluebird');

const db = require('./server/db/index.js');
const Recipe = require('./server/db/models/recipe-model.js');
const Ingredient = require('./server/db/models/ingredient-model.js');
const User = require('./server/db/models/user-model.js');


let data = require('./server/db-setup/theFINAL.json');

let ingredients = [];

data.forEach(recipe => {
  recipe.extendedIngredients.forEach(ingredient => {
    ingredients.push({
      apiIngId: ingredient.id,
      name: ingredient.name,
      category: ingredient.aisle
    });
  })
});

db.sync({force: true})
.then(() => {
  console.log('synced db');
  let recipePromises = data.map(recipe => {
    recipe.apiRecipeId = recipe.id;
    delete recipe.id;
    return Recipe.findOrCreate({
      where: {
        apiRecipeId: recipe.apiRecipeId
      },
      defaults: recipe
    })
    .then(recps => recps[0])
    .catch(err => {
      if (err.toString().split(':')[0] === 'SequelizeValidationError') return;
      else throw err;
    });
  });

  let ingredientPromises = ingredients.map(ingredient => {
    return Ingredient.findOrCreate({
      where: {
        apiIngId: ingredient.apiIngId
      },
      defaults: ingredient
    })
    .then(ing => ing[0]);
  });

  return Promise.all([...recipePromises, ...ingredientPromises]);
})
.then(() => {
  console.log('Created recipes & ingredients');
  return Recipe.findAll();
})
.then((recipes) => {

  let promises = [];

  recipes.forEach(recipe => {
    recipe.extendedIngredients.forEach(ingredient => {
      let id = ingredient.id;
      let promise = Ingredient.findOne({
        where: {
          apiIngId: id
        }
      })
      .then(ingredient2 => {
        if (!ingredient2) return;
        return recipe.addIngredient(ingredient2);
      }) // might be an error here with repeated ingredients...
      .catch(err => {
        if (err.name === 'SequelizeUniqueConstraintError') return;
        else throw err;
      });

      promises.push(promise);

    })
  })
  return Promise.all(promises);
})
.then(() => {

  return Recipe.findAll()
  .then((recipes) => {

    let recipePromises = recipes.map(function(recipe){
      return recipe.getMealsWithSimilarIngredients(10)
      .then(function(meals){
        return recipe.update({
          mealsWithSimilarIngredients: meals
        });
      });

    })

    return Promise.all(recipePromises);
  })
})
.then(() =>{
  return User.create({
    email: 'harry@hognwarts.com',
    password: 'iloveron',
    firstName: 'Harry',
    lastName: 'Potter',
    city: 'New York',
    state: 'New York',
    country: 'United Kingdom'
  })
})
.then(() => {
  console.log(chalk.green('seed successful'));
})
.catch(err => {
  console.log(chalk.red(err));
})
.finally(() => {
  console.log('closing db');
  db.close();
  process.exit(0);
  return null;
});
