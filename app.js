/**
 * Classification: UNCLASSIFIED
 *
 * @module app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description The main file for creating and deleting sandbox organizations.
 * NOTE: This file uses the models directly. This is not the recommended
 * approach, rather it is recommended you use the controllers. The models should
 * only be used directly if the controllers cannot provide the functionality
 * desired.
 */

// Node Modules
const express = require('express');

// NPM Modules
const uuidv4 = require('uuid/v4');

// MBEE Modules
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const Middleware = M.require('lib.middleware');
const { authenticate } = M.require('lib.auth');

const app = express();

/* --------------------( Main )-------------------- */

/**
 * @description Creates a sandbox organization for every user. Updates the user
 * to have a reference to the sandbox org.
 *
 * @param {Object[]} users - An array of user objects to create sandbox orgs for
 */
function createSandbox(users) {
  // Define an array of organizations to create
  const orgsToCreate = [];

  // For each user created
  users.forEach((user) => {
	  // Generate a random uuid as the id
	  const id = uuidv4();
	  // Create the organization object
	  const org = new Organization({
		  _id: id,
		  name: `Sandbox (${user.username})`,
		  permissions: {},
		  createdBy: user.username,
		  lastModifiedBy: user.username,
		  createdOn: Date.now(),
		  updatedOn: Date.now(),
		  custom: {
			  sandbox: true
		  }
	  });

	  // Set the created user as the org admin
	  org.permissions[user.username] = ['read', 'write', 'admin'];

	  // Add org to array to be created
	  orgsToCreate.push(org);

	  // Store the sandbox org id in custom data
	  user.custom.sandbox = id;
  });

  // Create all of the organizations
  Organization.insertMany(orgsToCreate)
  .then(() => {
    const promises = [];

    // Loop through each user
    users.forEach((user) => {
      // Log creation of sandbox
	    M.log.info(`Sandbox Plugin: ${user.username}'s sandbox org was created.`);

	    // Update the custom data for each user
	    promises.push(User.updateOne({ _id: user.username }, { custom: user.custom }))
    });

    // Return when all promises have completed
    return Promise.all(promises);
  })
  .catch((err) => M.log.warn(`Sandbox Plugin: ${err}`));
}

/**
 * @description Deletes sandbox orgs and any projects/elements name-spaced under
 * those orgs for multiple users.
 *
 * @param {Object[]} users - An array of user objects to delete sandbox orgs for
 */
function deleteSandbox(users) {
  let projectIDs = [];
  // For each user who was deleted
  users.forEach((user) => {
    // Delete the user's sandbox organization
    Organization.deleteOne(
      { _id: user.custom.sandbox,
        createdBy: user.username, // Point of consistency, cannot be changed via controller
        'custom.sandbox': true
      }
    )
    .then((query) => {
      // If the org was not deleted correctly
      if (query.ok !== 1 && query.deletedCount !== 1) {
        // Log a warning saying the users sandbox org was not deleted.
        M.log.warn(`Sandbox Plugin: ${user.username}'s sandbox org was not deleted...`);
        return [];
      }

      // If the org was deleted, find all of its projects
      return Project.find({ org: user.custom.sandbox });
    })
    .then((projects) => {
      // Save all projects ids for later element deletion
      projectIDs = projects.map(p => p._id);

      // Delete all projects that were found
      return Project.deleteMany({ org: user.custom.sandbox });
    })
    // Delete all elements name-spaced under the deleted projects
    .then(() => Element.deleteMany({ project: { $in: projectIDs } }))
    // Log deletion of sandbox org
    .then(() => M.log.info(`Sandbox Plugin: ${user.username}'s sandbox org was deleted.`))
    .catch((err) => M.log.warn(`Sandbox Plugin: ${err}`));
  });
}

/**
 * @description Adds an event listener which listens for the event
 * 'users-created'. Upon triggering of the event, the createSandbox() function
 * is called.
 */
EventEmitter.addListener('users-created', (users) => {
  createSandbox(users);
});

/**
 * @description Adds an event listener which listens for the event
 * 'users-deleted'. Upon triggering of the event, the deleteSandbox() function
 * is called.
 */
EventEmitter.addListener('users-deleted', (users) => {
  deleteSandbox(users);
});

// If the retroactive setting in the config is true, create sandbox orgs for all
// users who currently don't have one
if (M.config.server.plugins.sandbox.retroactive) {
  // Find all users who don't have a sandbox org
  User.find({ 'custom.sandbox': { $exists: false } })
  .then((users) => createSandbox(users));
}

// Redirects the plugin homepage to the users sandbox org homepage
app.get('/', authenticate, Middleware.logRoute, function(req, res) {
  return res.redirect(`/${req.user.custom.sandbox || ''}`);
});

// Export the express app
module.exports = app;
