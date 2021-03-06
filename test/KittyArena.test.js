'use strict';

const EVMRevert = require('./helpers/EVMRevert');

require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .use(require('chai-as-promised'))
  .should();

const KittyArena = artifacts.require('KittyArena')
const MockKittyCore = artifacts.require('MockKittyCore')
const MockDestiny = artifacts.require('MockDestiny')
const MockTiedDestiny = artifacts.require('MockTiedDestiny')

contract('KittyArena', function ([_, p1, p2, p3]) {

  const kitty1 = 42
  const kitty2 = 69
  const kitty3 = 1337

  beforeEach(async function () {
    this.ck = await MockKittyCore.new()
    await this.ck.mint(p1, kitty1);
    await this.ck.mint(p2, kitty2);
    await this.ck.mint(p3, kitty3);
    this.destiny = await MockDestiny.new()
    this.arena = await KittyArena.new(this.ck.address, this.destiny.address)
  })

  describe('enter mechanic', function() {
    it('first kitty can enter', async function() {
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      const tx = await this.arena.enter(kitty1, {from: p1})
      tx.logs.length.should.equal(1)
      tx.logs[0].event.should.equal('KittyEntered')
      tx.logs[0].args.gameId.should.bignumber.equal(0)
      tx.logs[0].args.kittyId.should.bignumber.equal(kitty1)
      tx.logs[0].args.owner.should.equal(p1)
    })

    it('second kitty can enter and fight starts', async function() {
      // first player approve and enter
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      await this.arena.enter(kitty1, {from: p1})

      // second player approve and enter
      await this.ck.approve(this.arena.address, kitty2, {from: p2})
      const tx = await this.arena.enter(kitty2, {from: p2})
      tx.logs.length.should.equal(2)
      tx.logs[0].event.should.equal('FightStarted')
      tx.logs[0].args.gameId.should.bignumber.equal(0)
      tx.logs[0].args.fightBlock.should.bignumber.equal(web3.eth.blockNumber)
      tx.logs[1].event.should.equal('KittyEntered')
      tx.logs[1].args.kittyId.should.bignumber.equal(kitty2)
      tx.logs[1].args.owner.should.equal(p2)
    })

    it('third kitty can enter and create new game', async function() {
      // first player approve and enter
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      await this.arena.enter(kitty1, {from: p1})

      // second player approve and enter
      await this.ck.approve(this.arena.address, kitty2, {from: p2})
      await this.arena.enter(kitty2, {from: p2})

      // third player approve and enter
      await this.ck.approve(this.arena.address, kitty3, {from: p3})
      const tx = await this.arena.enter(kitty3, {from: p3})

      tx.logs.length.should.equal(1)
      tx.logs[0].event.should.equal('KittyEntered')
      tx.logs[0].args.gameId.should.bignumber.equal(1)
      tx.logs[0].args.kittyId.should.bignumber.equal(kitty3)
      tx.logs[0].args.owner.should.equal(p3)
    })
  })

  describe('resolve mechanic', function() {

    it('cant resolve a game with one kitty', async function() {
      // first player approve and enter
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      await this.arena.enter(kitty1, {from: p1})

      const gameId = 0
      await this.arena.resolve(gameId).should.be.rejectedWith(EVMRevert)
    })

    it('can resolve a game with two kitties', async function() {
      // first player approve and enter
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      await this.arena.enter(kitty1, {from: p1})

      // second player approve and enter
      await this.ck.approve(this.arena.address, kitty2, {from: p2})
      await this.arena.enter(kitty2, {from: p2})
      
      const gameId = 0
      const tx = await this.arena.resolve(gameId)

      tx.logs.length.should.equal(1)
      tx.logs[0].event.should.equal('FightResolved')
      tx.logs[0].args.gameId.should.bignumber.equal(gameId)
      tx.logs[0].args.winner.should.equal(p1)

    })

    it('can resolve a game that ties', async function() {
      const destiny = await MockTiedDestiny.new()
      this.arena = await KittyArena.new(this.ck.address, destiny.address)
      const TIE = await this.arena.TIE();
      // first player approve and enter
      await this.ck.approve(this.arena.address, kitty1, {from: p1})
      await this.arena.enter(kitty1, {from: p1})

      // second player approve and enter
      await this.ck.approve(this.arena.address, kitty2, {from: p2})
      await this.arena.enter(kitty2, {from: p2})
      
      const gameId = 0
      const tx = await this.arena.resolve(gameId)

      tx.logs.length.should.equal(1)
      tx.logs[0].event.should.equal('FightResolved')
      tx.logs[0].args.gameId.should.bignumber.equal(gameId)
      tx.logs[0].args.winner.should.equal(TIE)

    })

  })

})
