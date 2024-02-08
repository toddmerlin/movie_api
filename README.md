# myFlix-client

## Objective
Using React, build the client-side for an app called myFlix based on its
existing server-side code - REST API and database.

## Requirements
- Single-page application (SPA)
- State routing to navigate between views and share URLs
- Search feature for users to filter selections using React Redux
- Parcel as its build tool
- React library and in ES2015+
Bootstrap as a UI library for styling and responsiveness
React Redux for state management

## Features:
### Main view
- Returns ALL movies to the user (each movie item with an image, title, and description)
- Filtering the list of movies with a “search” feature
- Ability to select a movie for more details
- Ability to log out
- Ability to navigate to Profile view
### Single Movie view
- Returns data (description, genre, director, image) about a single movie to the user
- Allows users to add a movie to their list of favorites
### Login view
- Allows users to log in with a username and password
### Signup view
- Allows new users to register (username, password, email, date of birth)
### Profile view
- Displays user registration details
- Allows users to update their info (username, password, email, date of birth)
- Displays favorite movies
- Allows users to remove a movie from their list of favorites
- Filtering the list of movies with a “search” feature
- Allows existing users to deregister
