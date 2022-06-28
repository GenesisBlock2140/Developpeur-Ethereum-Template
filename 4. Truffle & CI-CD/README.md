
# Projet Truffle - Tests unitaire

Test unitaire pour le projet n'2 d'Alyra, test unitaire de la correction du Système de Vote fourni par Cyril sur github.

- 25 tests unitaire sont disponibles dans le fichier javascript **votingTest.js**

## Installer les modules nécessaires aux tests
- npm install @openzeppelin/test-helpers @openzeppelin/contracts @truffle/hdwallet-provider dotenv
- Assertion via chaiJS

## Test addVoter (6)
* Ajout simple d'un Voter, la valeur isRegistered doit être à true
* Lors d'un Ajout d'un Voter, la valeur hasVoted doit être à false
* Lors d'un Ajout d'un Voter, la valeur votedProposalId doit être à 0
* Le test doit revert car le Voter est déjà enregistré 
* Le test doit revert car le state n'est pas le bon
* Vérification de l'emit de l'event addVoter

## Test addProposal (5)
* Le test doit revert car le state n'est pas le bon
* Le Voter doit pouvoir ajouter un proposal
* Le Voter doit pouvoir ajouter un proposal, avec countVote à 0
* Le test doit revert car le Voter n'est pas whitelist
* Le test doit revert car le Voter a proposé une valeur nulle " "

## Test setVote (4)
* Le test doit revert car le state n'est pas le bon
* Le test doit revert car le Voter n'est pas whitelist
* Le Voter doit pouvoir voter pour un proposal
* Le test doit revert car le Voter à déjà voté

## Test Event (4)
* Test event VoterRegistered
* Test event WorkflowStatusChange
* Test event ProposalRegistered
* Test event Voted

## Test WorkflowStatus (5)
* Test du WorkflowStatus par default
* Test de la fonction startProposalsRegistering
* Test de la fonction endProposalsRegistering
* Test de la fonction startVotingSession
* Test de la fonction endVotingSession

## Test tallyVotes (fonction pour déterminer le vainqueur)
* Test avec plusieurs proposals pour vérifier le bon fonctionnement de la fonction et déterminer la proposition gagnante.