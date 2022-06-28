const Voting = artifacts.require("Voting");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract('Voting', accounts => {

    // Init accounts
    const owner = accounts[0];
    const second = accounts[1];
    const third = accounts[2];
    const fourth = accounts[3];

    let VotingInstance;

    describe("test register voter (6) ", function () {

        beforeEach(async function () {
            VotingInstance = await Voting.new({from:owner});
            await VotingInstance.addVoter(owner, { from: owner });
            await VotingInstance.addVoter(second, { from: owner });
        });

        it("should add voter in mapping voters", async () => {
            const storedData = await VotingInstance.getVoter(second, { from: owner });
            expect(storedData.isRegistered).to.be.true;
        });

        it("should add voter, init false hasVoted", async () => {
            const storedData = await VotingInstance.getVoter(second, { from: owner });
            expect(storedData.hasVoted).to.be.false;
        });

        it("should add voter, init 0 votedProposalId", async () => {
            const storedData = await VotingInstance.getVoter(second, { from: owner });
            expect(storedData.votedProposalId).to.bignumber.equal(new BN(0));
        });

        // Testing revert for addVoter function
        context("should revert in Voter", () => {

            it("should revert add voter, already register", async () => {
                await expectRevert(VotingInstance.addVoter(second, { from: owner }), "Already registered");
            });

            it("should revert add voter, because not RegisteringVoters state", async () => {
                await VotingInstance.startProposalsRegistering({from: owner});
                await expectRevert(VotingInstance.addVoter(second, { from: owner }), "Voters registration is not open yet");
            });
        });

        it("should emit event add voter", async () => {
            expectEvent(await VotingInstance.addVoter(third, { from: owner }), 'VoterRegistered', {
                voterAddress: third
            });
        });

    });

    // Testing AddProposal function
    describe("test addProposal (5)", function () {

        before(async function () {
            VotingInstance = await Voting.new({from:owner});
            await VotingInstance.addVoter(owner, { from: owner });
            await VotingInstance.addVoter(second, { from: owner });
        });

        it("should revert because not ProposalsRegistrationStarted state", async () => {
            await expectRevert(VotingInstance.addProposal("proposal1", {from: second}), "Proposals are not allowed yet");
        });

        it("should addProposal", async () => {
            await VotingInstance.startProposalsRegistering({from: owner});
            await VotingInstance.addProposal("proposal1", {from: second});
            expect((await VotingInstance.getOneProposal(0)).description).to.equal("proposal1");
        });

        it("should addProposal and set voteCount to 0", async () => {
            await VotingInstance.addProposal("proposal2", {from: second});
            expect((await VotingInstance.getOneProposal(0)).voteCount).to.be.bignumber.equal(new BN(0));
        });

        it("should revert addProposal because not whitelist", async () => {
            await expectRevert(VotingInstance.addProposal("proposal3", {from: third}), "You're not a voter");
        });

        it("should revert because proposal is empty", async () => {
            await expectRevert(VotingInstance.addProposal("", {from: second}), "Vous ne pouvez pas ne rien proposer");
        });

    });

    // Testing setVote function
    describe("test setVote (4)", function () {

        before(async function () {
            VotingInstance = await Voting.new({from:owner});
            await VotingInstance.addVoter(owner, { from: owner });
            await VotingInstance.addVoter(second, { from: owner });
            await VotingInstance.startProposalsRegistering({from: owner});
            await VotingInstance.addProposal("proposal1", {from: second});
            await VotingInstance.endProposalsRegistering({from: owner});
        });

        it("should revert because not startVotingSession state", async () => {
            await expectRevert(VotingInstance.setVote(0, {from: second}), "Voting session havent started yet");
        });

        it("should revert because not whitelist", async () => {
            await VotingInstance.startVotingSession({from: owner});
            await expectRevert(VotingInstance.setVote(0, {from: third}), "You're not a voter");
        });

        it("should setVote", async () => {
            await VotingInstance.setVote(0, {from: second});
            const data = await VotingInstance.getVoter(second, {from: owner});
            expect(data.hasVoted).to.be.true;
        }); 

        it("should revert because You have already voted", async () => {
            await expectRevert(VotingInstance.setVote(0, {from: second}), "You have already voted");
        });

    });

    // Testing all events
    describe("test ALL events (4)", function () {

        beforeEach(async function () {
            VotingInstance = await Voting.new({from:owner});
            await VotingInstance.addVoter(owner, { from: owner });
        });

        it("should emit event VoterRegistered", async () => {
            expectEvent(await VotingInstance.addVoter(third, { from: owner }), 'VoterRegistered', {
                voterAddress: third
            });
        });

        it("should emit event WorkflowStatusChange", async () => {
            expectEvent(await VotingInstance.startProposalsRegistering({ from: owner }), 'WorkflowStatusChange', {
                previousStatus: new BN(0),
                newStatus: new BN(1)
            });
        });

        it("should emit event ProposalRegistered", async () => {
            await VotingInstance.startProposalsRegistering({ from: owner });
            expectEvent(await VotingInstance.addProposal( "plus de frites a la cantine" ,{ from: owner }), 'ProposalRegistered', {
                proposalId: new BN(0)
            });
        });

        it("should emit event Voted", async () => {
            await VotingInstance.startProposalsRegistering({ from: owner });
            await VotingInstance.addProposal( "plus de frites a la cantine" ,{ from: owner });
            await VotingInstance.endProposalsRegistering({ from: owner });
            await VotingInstance.startVotingSession({ from: owner });
            expectEvent(await VotingInstance.setVote(0, { from: owner }), 'Voted', {
                voter: owner,
                proposalId: new BN(0)
            });
        });
    });

    // Testing all workflowstatus function
    describe("test ALL WorkflowStatus State (5)", function () {

        before(async function () {
            VotingInstance = await Voting.new({from:owner});
        });

        it("should workflowStatus return 0 at init", async () => {
            expect(await VotingInstance.workflowStatus({from: owner})).to.be.bignumber.equal(new BN(0));
        });

        it("should workflowStatus go to startProposalsRegistering", async () => {
            await VotingInstance.startProposalsRegistering({from: owner});
            expect(await VotingInstance.workflowStatus({from: owner})).to.be.bignumber.equal(new BN(1));
        });

        it("should workflowStatus go to endProposalsRegistering", async () => {
            await VotingInstance.endProposalsRegistering({from: owner});
            expect(await VotingInstance.workflowStatus({from: owner})).to.be.bignumber.equal(new BN(2));
        });

        it("should workflowStatus go to startVotingSession", async () => {
            await VotingInstance.startVotingSession({from: owner});
            expect(await VotingInstance.workflowStatus({from: owner})).to.be.bignumber.equal(new BN(3));
        });

        it("should workflowStatus go to endVotingSession", async () => {
            await VotingInstance.endVotingSession({from: owner});
            expect(await VotingInstance.workflowStatus({from: owner})).to.be.bignumber.equal(new BN(4));
        });

    });

    // Testing tallyVotes
    describe("test tallyVotes (1)", function () {

        before(async function () {

            // Init
            VotingInstance = await Voting.new({from:owner});

            // addVoter
            await VotingInstance.addVoter(owner, { from: owner });
            await VotingInstance.addVoter(second, { from: owner });
            await VotingInstance.addVoter(third, { from: owner });

            // Proposal
            await VotingInstance.startProposalsRegistering({from: owner});

            await VotingInstance.addProposal("proposal1", {from: second});
            await VotingInstance.addProposal("proposal2", {from: third});

            await VotingInstance.endProposalsRegistering({from: owner});

            // Voting Session
            await VotingInstance.startVotingSession({from: owner});

            await VotingInstance.setVote(0, {from: owner});
            await VotingInstance.setVote(1, {from: second});
            await VotingInstance.setVote(1, {from: third});

            await VotingInstance.endVotingSession({from: owner});

        });

        // 2nd proposal should win ( ID: 1 )
        it("should set winningProposalID to winner ID", async () => {
            await VotingInstance.tallyVotes({from: owner});
            const dataWinner = await VotingInstance.winningProposalID.call();
            expect(new BN(dataWinner)).to.be.bignumber.equal(new BN(1));
        });

    });


});