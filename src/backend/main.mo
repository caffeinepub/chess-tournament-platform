import Array "mo:core/Array";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  type TournamentStatus = {
    #registration;
    #active;
    #completed;
  };

  type PlayerStatus = {
    #active;
    #oneLoss;
    #eliminated;
  };

  type MatchResult = {
    #pending;
    #completed;
  };

  type Tournament = {
    id : Text;
    name : Text;
    status : TournamentStatus;
    createdAt : Int;
    winner : ?Text;
  };

  type Player = {
    id : Text;
    tournamentId : Text;
    name : Text;
    losses : Nat;
    eliminated : Bool;
    status : PlayerStatus;
  };

  type Round = {
    roundNumber : Nat;
    tournamentId : Text;
    matches : [Match];
    completed : Bool;
  };

  type Match = {
    id : Text;
    tournamentId : Text;
    roundNumber : Nat;
    player1Id : Text;
    player2Id : Text;
    player1Name : Text;
    player2Name : Text;
    winnerId : ?Text;
    loserId : ?Text;
    result : MatchResult;
    byePlayerId : ?Text;
  };

  module Tournament {
    public func compareByCreatedAt(t1 : Tournament, t2 : Tournament) : Order.Order {
      Nat.compare(
        t1.createdAt.toNat(),
        t2.createdAt.toNat(),
      );
    };
  };

  module Round {
    public func compare(r1 : Round, r2 : Round) : Order.Order {
      Nat.compare(r1.roundNumber, r2.roundNumber);
    };
  };

  let tournaments = Map.empty<Text, Tournament>();
  let players = Map.empty<Text, Player>();
  let rounds = Map.empty<Text, Round>();
  let matches = Map.empty<Text, Match>();

  func getTournamentOrTrap(tournamentId : Text) : Tournament {
    switch (tournaments.get(tournamentId)) {
      case (null) { Runtime.trap("Tournament does not exist") };
      case (?tournament) { tournament };
    };
  };

  func getPlayerOrTrap(playerId : Text) : Player {
    switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) { player };
    };
  };

  func getRoundOrTrap(roundId : Text) : Round {
    switch (rounds.get(roundId)) {
      case (null) { Runtime.trap("Round does not exist") };
      case (?round) { round };
    };
  };

  func getMatchOrTrap(matchId : Text) : Match {
    switch (matches.get(matchId)) {
      case (null) { Runtime.trap("Match does not exist") };
      case (?match) { match };
    };
  };

  func getPlayerName(playerId : Text) : Text {
    let player = getPlayerOrTrap(playerId);
    player.name;
  };

  public shared ({ caller }) func createTournament(name : Text) : async Tournament {
    let id = name.concat(Time.now().toText());
    let tournament : Tournament = {
      id;
      name;
      status = #registration;
      createdAt = Time.now();
      winner = null;
    };
    tournaments.add(id, tournament);
    tournament;
  };

  public query ({ caller }) func getTournament(id : Text) : async Tournament {
    getTournamentOrTrap(id);
  };

  public query ({ caller }) func getAllTournaments() : async [Tournament] {
    tournaments.values().toArray();
  };

  public shared ({ caller }) func addPlayer(tournamentId : Text, name : Text) : async Player {
    let tournament = getTournamentOrTrap(tournamentId);
    if (tournament.status != #registration) {
      Runtime.trap("Tournament must be in registration phase ");
    };
    for ((_, player) in players.entries()) {
      if (player.name == name and player.tournamentId == tournamentId) {
        Runtime.trap("Player name must be unique in a tournament");
      };
    };
    let id = name.concat(Time.now().toText());
    let player : Player = {
      id;
      tournamentId;
      name;
      losses = 0;
      eliminated = false;
      status = #active;
    };
    players.add(id, player);
    player;
  };

  public query ({ caller }) func getPlayersByTournament(tournamentId : Text) : async [Player] {
    players.values().toArray().filter(
      func(p) { p.tournamentId == tournamentId }
    );
  };

  public shared ({ caller }) func startTournament(tournamentId : Text) : async Tournament {
    let tournament = getTournamentOrTrap(tournamentId);
    if (tournament.status != #registration) {
      Runtime.trap("Tournament must be in registration phase");
    };
    let tournamentPlayers = players.values().toArray().filter(
      func(p) { p.tournamentId == tournamentId }
    );
    if (tournamentPlayers.size() < 2) {
      Runtime.trap("At least 2 players required to start the tournament");
    };
    let updatedTournament : Tournament = {
      id = tournament.id;
      name = tournament.name;
      status = #active;
      createdAt = tournament.createdAt;
      winner = tournament.winner;
    };
    tournaments.add(tournamentId, updatedTournament);
    updatedTournament;
  };

  public query ({ caller }) func getRoundsByTournament(tournamentId : Text) : async [Round] {
    rounds.values().toArray().filter(
      func(r) { r.tournamentId == tournamentId }
    );
  };

  public query ({ caller }) func getCurrentRound(tournamentId : Text) : async ?Round {
    let tournamentRounds = rounds.values().toArray().filter(
      func(r) { r.tournamentId == tournamentId }
    );
    let incompleteRounds = tournamentRounds.filter(
      func(r) { not r.completed }
    );
    if (incompleteRounds.size() > 0) {
      ?incompleteRounds[0];
    } else {
      null;
    };
  };

  public shared ({ caller }) func recordMatchResult(matchId : Text, winnerId : Text, loserId : Text) : async Match {
    let match = getMatchOrTrap(matchId);
    if (match.result != #pending) {
      Runtime.trap("Match result cannot be recorded twice");
    };
    let updatedMatch : Match = {
      id = match.id;
      tournamentId = match.tournamentId;
      roundNumber = match.roundNumber;
      player1Id = match.player1Id;
      player2Id = match.player2Id;
      player1Name = match.player1Name;
      player2Name = match.player2Name;
      winnerId = ?winnerId;
      loserId = ?loserId;
      result = #completed;
      byePlayerId = match.byePlayerId;
    };
    matches.add(matchId, updatedMatch);

    for (id in [winnerId, loserId].values()) {
      let player = getPlayerOrTrap(id);
      players.add(
        id,
        {
          id = player.id;
          tournamentId = player.tournamentId;
          name = player.name;
          losses = if (id == loserId) { player.losses + 1 } else { player.losses };
          eliminated = if (id == loserId and player.losses + 1 == 2) {
            true;
          } else { player.eliminated };
          status = if (id == loserId and player.losses + 1 == 2) {
            #eliminated;
          } else if (id == loserId) {
            #oneLoss;
          } else { player.status };
        },
      );
    };

    updatedMatch;
  };

  public shared ({ caller }) func completeTournament(tournamentId : Text, winner : Text) : async Tournament {
    let tournament = getTournamentOrTrap(tournamentId);
    let updatedTournament : Tournament = {
      id = tournament.id;
      name = tournament.name;
      status = #completed;
      createdAt = tournament.createdAt;
      winner = ?winner;
    };
    tournaments.add(tournamentId, updatedTournament);
    updatedTournament;
  };

  public shared ({ caller }) func updateTournamentStatus(tournamentId : Text, status : TournamentStatus) : async Tournament {
    let tournament = getTournamentOrTrap(tournamentId);
    let updatedTournament : Tournament = {
      id = tournament.id;
      name = tournament.name;
      status;
      createdAt = tournament.createdAt;
      winner = tournament.winner;
    };
    tournaments.add(tournamentId, updatedTournament);
    updatedTournament;
  };

  public shared ({ caller }) func deleteTournament(tournamentId : Text) : async () {
    if (not tournaments.containsKey(tournamentId)) { Runtime.trap("Tournament does not exist") };
    tournaments.remove(tournamentId);
  };
};
