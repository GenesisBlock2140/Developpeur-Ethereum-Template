// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

contract Voting is Ownable {

    // First proposal ID 0 is use as blank vote, to see difference between blank vote and abstention 
    constructor () {
        proposals.push(Proposal("vote blanc", 0));
    }

    uint winningProposalId;
    uint totalWhitelistedAddress;

    mapping (address => Voter) participants;
    Proposal[] public proposals;
    WorkflowStatus voteState;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }


    // Event for addManyToWhitelist to avoid X emit in for loop
    event ManyVoterRegistered(address[] votersAddress);
    // Event for removeFromWhitelist
    event VoterRemoved(address voterRemovedAddress);

    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    // Allows whitelist people to see each other's information and vote, ONLY ADDRESS WHITELIST can use function, not random people
    modifier onlyWhitelist {
        require(isWhitelisted(msg.sender) || msg.sender == Ownable.owner(), "You are not whitelist");
        _;
    }

    // To simply change the state, but also to be able to go back in case of problem, (forget to add an address for example)
    function changeState(uint _newState) public onlyOwner {
        require(_newState < 6, "Please select correct state");
        WorkflowStatus _preVvoteState = voteState;
        voteState = WorkflowStatus(_newState);
        emit WorkflowStatusChange(_preVvoteState, WorkflowStatus(_newState));
    }

    // Change the state to the next state, if it's last step then use reset function
    function nextState() public onlyOwner{
        require(voteState != WorkflowStatus.VotesTallied, "Please use reset function to reset Voting contract");
        WorkflowStatus _preVvoteState = voteState;
        voteState = WorkflowStatus(uint(voteState) + 1);
        emit WorkflowStatusChange(_preVvoteState, voteState);
    }

    // This function will reset data for an other session, address whitelisted are not reset, owner can remove whitelisted address with function
    function reset() public onlyOwner{
        require(voteState == WorkflowStatus.VotesTallied, "You need to be at last state to reset");
        delete proposals;
        proposals.push(Proposal("vote blanc", 0));
        winningProposalId = 0;
        voteState = WorkflowStatus(0);
    }

    // Add an address to whitelist
    function addToWhitelist(address _addr) public onlyOwner {
        require(voteState == WorkflowStatus(0) && participants[_addr].isRegistered == false,"It's not time to register or this person is already in");
        participants[_addr] = Voter(true, false, 0);
        totalWhitelistedAddress += 1;
        emit VoterRegistered(_addr);
    }

    // Remove an address from whitelist
    function removeFromWhitelist(address _addr) public onlyOwner {
        require(voteState == WorkflowStatus(0) && participants[_addr].isRegistered,"It's not time to remove from whitelist or this person is not in whitelist");
        participants[_addr] = Voter(false, false, 0);
        totalWhitelistedAddress -= 1;
        emit VoterRemoved(_addr);
    }

    // Add many address to whitelist, i don't check if address is already whitelisted to avoid high gas
    // Ex: If only 1 address is already whitelisted of 100 address it will cancel tx, it is not very profitable ...
    // This will cause a small problem with the "totalWhitelistedAddress" variable, to avoid this you have to make a loop to check that the addresses are ALL not whitelisted.
    // I didn't do it due to a lack of personal time
    function addManyToWhitelist(address[] memory _addr) public onlyOwner {
        require(_addr.length > 0 && voteState == WorkflowStatus(0), "You need add at least one person");
        for(uint i = 0; i < _addr.length;i++){
            participants[_addr[i]] = Voter(true, false, 0);
        }
        totalWhitelistedAddress = totalWhitelistedAddress + _addr.length;
        emit ManyVoterRegistered(_addr);
    }

    // Check if an address is whitelisted
    function isWhitelisted(address _addr) public view returns(bool) {
        return (participants[_addr].isRegistered);
    }

    // Submit a proposal only if you are whitelisted and if it's the right time to do it
    function submitProposal(string memory _description) public onlyWhitelist {
        require(voteState == WorkflowStatus(1), "You can't submit proposal now");
        proposals.push(Proposal(_description, 0));
        emit ProposalRegistered(proposals.length);
    }

    // Vote one time if you are whitelist
    // If _proposalId = 0 then it's blank vote
    function vote(uint _proposalId) public onlyWhitelist {
        require(voteState == WorkflowStatus.VotingSessionStarted && participants[msg.sender].hasVoted == false, "You can't vote now, or you have already voted");
        require(_proposalId < proposals.length, "Please select valid ID for proposal");
        participants[msg.sender] = Voter(true, true, _proposalId);
        proposals[_proposalId].voteCount++;
        emit Voted(msg.sender, _proposalId);
    }

    // Count vote when Voting Session Ended
    function countVote() public onlyOwner {
        require(voteState == WorkflowStatus.VotingSessionEnded, "Not time to count");
        Proposal[] memory _tempProposals = proposals;
        uint _valueMax;
        uint _idProposalMax;
        for (uint i = 1; i < _tempProposals.length; ++i) {
            if (_tempProposals[i].voteCount > _valueMax) {
                _valueMax = _tempProposals[i].voteCount;
                _idProposalMax = i;
            }
        }
        winningProposalId = _idProposalMax;
    }

    // Get description of Proposal
    function getProposalDescription(uint _proposalId) public view onlyWhitelist returns(string memory){
        require(_proposalId < proposals.length, "Please select valid ID for proposal");
        return proposals[_proposalId].description;
    }

    // Get voteCount of Proposal, at anytime because it's blockchain and everything is already public
    function getProposalVoteCount(uint _proposalId) public view onlyWhitelist returns(uint) {
        require(_proposalId < proposals.length, "Please select valid ID for proposal");
        return proposals[_proposalId].voteCount;
    }

    // Get Proposal Winner ID if it's not ID = 0 (Blank Vote) 
    function getWinner() public view onlyWhitelist returns(uint) {
        require(winningProposalId != 0, "No winner for the moment");
        return (winningProposalId);
    }

    // Get vote proposal id from whitelisted address
    function getVoteOf(address _addr) public view onlyWhitelist returns(uint) {
        return (participants[_addr].votedProposalId);
    }

    // Get Blank Vote, only after vote count
    function getBlankVote() public view onlyWhitelist returns(uint)  {
        require(voteState == WorkflowStatus.VotesTallied, "The votes are not yet counted");
        return proposals[0].voteCount;
    }

    // Return number of address whitelisted that didn't vote
    // TotalWhitelist - TotalVote (including Blank vote at index 0) 
    function getNonVoting() public view onlyWhitelist returns(uint)  {
        require(voteState == WorkflowStatus.VotesTallied, "The votes are not yet counted");
        Proposal[] memory _tempProposals = proposals;
        uint _TotalVote;
        for (uint i = 0; i < _tempProposals.length; ++i) {
            _TotalVote += _tempProposals[i].voteCount;
        }
        return (totalWhitelistedAddress - _TotalVote);
    }

    // Check if an address has voted
    function hasVoted(address _addr) public view onlyWhitelist returns(bool) {
        require(isWhitelisted(_addr), "This address can't vote");
        return (participants[_addr].hasVoted);
    }

    // Get total of address whitelisted
    function getTotalWhitelistedAddress() public view onlyWhitelist returns(uint) {
        return (totalWhitelistedAddress);
    }

/*
    Improvement that I could have made: equality system for vote, I know how to do it but lack of time (bad personal time management).
*/
}