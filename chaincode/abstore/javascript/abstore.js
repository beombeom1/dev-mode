/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

const shim = require('fabric-shim');
const util = require('util');

const ABstore = class {

  // Initialize the chaincode
  async Init(stub) {
    console.info('========= ABstore Init =========');
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    try {
        await stub.putState("admin", Buffer.from("0"));
        return shim.success();
    } catch (err) {
        return shim.error(err);
    }
}

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    let method = this[ret.fcn];
    if (!method) {
      console.log('no method of name:' + ret.fcn + ' found');
      return shim.success();
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async init(stub, args) {
    // initialise only if 3 parameters passed.
    if (args.length != 3) {
        return shim.error('Incorrect number of arguments. Expecting 3');
    }

    let A = args[0];
    let Aval = args[1];
    let Apoint = args[2];

    if (typeof parseInt(Aval) !== 'number' || typeof parseInt(Apoint) !== 'number') {
        return shim.error('Expecting integer value for asset holding and point');
    }

    await stub.putState(A, Buffer.from(Aval));
    await stub.putState(A + '_point', Buffer.from(Apoint));
}

async invokePoint(stub, args) {
  if (args.length != 3) {
    throw new Error('Incorrect number of arguments. Expecting 3');
  }

  let A = args[0];
  let B = args[1];

  if (!A || !B) {
    throw new Error('Asset holding must not be empty');
  }

  // Get the points state from the ledger
  let ApointBytes = await stub.getState(A + '_point');
  if (!ApointBytes || ApointBytes.length === 0) {
    throw new Error('Failed to get state of asset holder A');
  }
  let Apoints = parseInt(ApointBytes.toString());

  let BpointBytes = await stub.getState(B + '_point');
  if (!BpointBytes || BpointBytes.length === 0) {
    throw new Error('Failed to get state of asset holder B');
  }
  let Bpoints = parseInt(BpointBytes.toString());

  // Perform the execution
  let amount = parseInt(args[2]);
  if (typeof amount !== 'number') {
    throw new Error('Expecting integer value for amount to be transferred');
  }

  Apoints = Apoints - amount;
  Bpoints = Bpoints + amount;
  console.info(`Apoints = ${Apoints}, Bpoints = ${Bpoints}`);

  // Write the states back to the ledger
  await stub.putState(A + '_point', Buffer.from(Apoints.toString()));
  await stub.putState(B + '_point', Buffer.from(Bpoints.toString()));
}

  async invoke(stub, args) {
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    let A = args[0];
    let B = args[1];
    let Admin = "admin";
    if (!A || !B) {
      throw new Error('asset holding must not be empty');
    }

    // Get the state from the ledger
    let Avalbytes = await stub.getState(A);
    if (!Avalbytes) {
      throw new Error('Failed to get state of asset holder A');
    }
    let Aval = parseInt(Avalbytes.toString());

    let Bvalbytes = await stub.getState(B);
    if (!Bvalbytes) {
      throw new Error('Failed to get state of asset holder B');
    }

    let Bval = parseInt(Bvalbytes.toString());

    let AdminValbytes = await stub.getState(Admin);
    if (!AdminValbytes) {
      throw new Error('Failed to get state of asset Admin');
    }

    let AdminVal = parseInt(Bvalbytes.toString());

    // Perform the execution
    let amount = parseInt(args[2]);
    if (typeof amount !== 'number') {
      throw new Error('Expecting integer value for amount to be transaferred');
    }

    Aval = Aval - amount;
    Bval = Bval + amount - ( amount / 10 );
    AdminVal = AdminVal + ( amount / 10 );
    console.info(util.format('Aval = %d, Bval = %d, AdminVal = %d\n', Aval, Bval, AdminVal));

    // Write the states back to the ledger
    await stub.putState(A, Buffer.from(Aval.toString()));
    await stub.putState(B, Buffer.from(Bval.toString()));
    await stub.putState(Admin, Buffer.from(AdminVal.toString()));

  }

  // Deletes an entity from state
  async delete(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }

    let A = args[0];

    // Delete the key from the state in ledger
    await stub.deleteState(A);
  }

  // query callback representing the query of a chaincode
  async query(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the person to query')
    }

    let jsonResp = {};
    let A = args[0];

    // Get the state from the ledger
    let Avalbytes = await stub.getState(A);
    if (!Avalbytes) {
      jsonResp.error = 'Failed to get state for ' + A;
      throw new Error(JSON.stringify(jsonResp));
    }

    jsonResp.name = A;
    jsonResp.amount = Avalbytes.toString();
    console.info('Query Response:');
    console.info(jsonResp);
    return Avalbytes;
  }

  async queryPoint(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the person to query');
    }

    let jsonResp = {};
    let A = args[0];

    // Get the state from the ledger
    let Avalbytes = await stub.getState(A);
    if (!Avalbytes || Avalbytes.length === 0) {
      jsonResp.error = 'Failed to get state for ' + A;
      throw new Error(JSON.stringify(jsonResp));
    }

    jsonResp.name = A;
    jsonResp.points = Avalbytes.toString();
    console.info('Query Point Response:');
    console.info(jsonResp);
    return Avalbytes;
}

// New function to query both cash and points
async queryAll(stub, args) {
  if (args.length != 1) {
    throw new Error('Incorrect number of arguments. Expecting name of the person to query');
  }

  let jsonResp = {};
  let A = args[0];

  // Get the cash state from the ledger
  let Avalbytes = await stub.getState(A);
  if (!Avalbytes) {
    jsonResp.error = 'Failed to get state for ' + A;
    throw new Error(JSON.stringify(jsonResp));
  }
  jsonResp.name = A;
  jsonResp.amount = Avalbytes.toString();

  // Get the points state from the ledger
  let ApointBytes = await stub.getState(A + '_point');
  if (!ApointBytes || ApointBytes.length === 0) {
    jsonResp.error = 'Failed to get state for ' + A + '_point';
    throw new Error(JSON.stringify(jsonResp));
  }
  jsonResp.points = ApointBytes.toString();

  console.info('Query All Response:');
  console.info(jsonResp);
  return Buffer.from(JSON.stringify(jsonResp));
}

async purchaseBook(stub, args) {
  if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
  }

  let userID = args[0];
  let bookID = args[1];

  // Hardcoded book prices
  const bookPrices = {
      book1: 8000,
      book2: 9000,
      book3: 7500,
      book4: 10000,
      book5: 5000,
      book6: 6000,
      book7: 8500,
      book8: 9500,
      book9: 7000,
      book10: 12000
  };

  let bookPrice = bookPrices[bookID];
  if (!bookPrice) {
      throw new Error('Invalid book ID');
  }

  let userCashKey = userID;
  let userPointsKey = userID + '_point';
  let adminKey = 'admin';

  // Get user cash and points
  let userCashBytes = await stub.getState(userCashKey);
  let userPointsBytes = await stub.getState(userPointsKey);
  let adminBytes = await stub.getState(adminKey);

  if (!userCashBytes || userCashBytes.length === 0) {
      throw new Error('User cash balance not found');
  }
  if (!userPointsBytes || userPointsBytes.length === 0) {
      throw new Error('User points balance not found');
  }
  if (!adminBytes || adminBytes.length === 0) {
      throw new Error('Admin balance not found');
  }

  let userCash = parseInt(userCashBytes.toString());
  let userPoints = parseInt(userPointsBytes.toString());
  let adminBalance = parseInt(adminBytes.toString());

  let totalPrice = bookPrice;
  let pointsUsed = Math.min(userPoints, totalPrice);
  let cashNeeded = totalPrice - pointsUsed;

  if (userCash < cashNeeded) {
      throw new Error('Insufficient funds');
  }

  // Deduct points and cash
  userPoints -= pointsUsed;
  userCash -= cashNeeded;

  // Add points for the purchase (10% of the book price)
  let pointsEarned = bookPrice * 0.10;
  userPoints += pointsEarned;

  // Update admin balance
  adminBalance += bookPrice * 0.10;

  // Write the new states back to the ledger
  await stub.putState(userCashKey, Buffer.from(userCash.toString()));
  await stub.putState(userPointsKey, Buffer.from(userPoints.toString()));
  await stub.putState(adminKey, Buffer.from(adminBalance.toString()));

  console.info(`User ${userID} purchased ${bookID} for ${bookPrice} units: ${pointsUsed} points and ${cashNeeded} cash used.`);
  return Buffer.from('Purchase successful');
}
async chargeMoney(stub, args) {
  if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
  }

  let userID = args[0];
  let amount = parseInt(args[1]);

  if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Expecting positive integer value for amount');
  }

  let userCashBytes = await stub.getState(userID);
  if (!userCashBytes || userCashBytes.length === 0) {
      throw new Error('User not found');
  }

  let userCash = parseInt(userCashBytes.toString());
  userCash += amount;

  await stub.putState(userID, Buffer.from(userCash.toString()));

  console.info(`User ${userID} charged with ${amount} units.`);
  return Buffer.from('Charge successful');
}
};

shim.start(new ABstore());
