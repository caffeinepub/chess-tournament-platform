import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";



actor {
  type TournamentStatus = { #registration; #active; #completed };

  type PlayerStatus = { #active; #oneLoss; #eliminated };

  type MatchResult = { #pending; #completed };

  type Tournament = {
    id : Text;
    name : Text;
    status : TournamentStatus;
    createdAt : Int;
    winner : ?Text;
    eliminationCount : Nat;
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

  func shufflePlayers(players : [Player]) : [Player] {
    if (players.size() <= 1) {
      return players;
    };

    var seed = (Time.now().toNat() * 1664525 + 1013904223) % 4294967296;

    let buf = players.toVarArray<Player>();

    var i = players.size() - 1;
    while (i > 0) {
      seed := (seed * 1664525 + 1013904223) % 4294967296;
      let randomIndex = Int.abs(seed) % (i + 1);
      let temp = buf[i];
      buf[i] := buf[randomIndex];
      buf[randomIndex] := temp;
      i -= 1;
    };

    buf.toArray();
  };

  func buildRound(tournamentId : Text, roundNumber : Nat, shuffledPlayers : [Player]) : Round {
    var matchList : [Match] = [];
    var i = 0;
    while (i + 1 < shuffledPlayers.size()) {
      let player1 = shuffledPlayers[i];
      let player2 = shuffledPlayers[i + 1];

      let matchId = "m-" # tournamentId # "-" # roundNumber.toText() # "-" # (i / 2).toText() # "-" # Time.now().toText();
      let match : Match = {
        id = matchId;
        tournamentId;
        roundNumber;
        player1Id = player1.id;
        player2Id = player2.id;
        player1Name = player1.name;
        player2Name = player2.name;
        winnerId = null;
        loserId = null;
        result = #pending;
        byePlayerId = null;
      };
      matchList := matchList.concat([match]);
      matches.add(matchId, match);

      i += 2;
    };

    if (shuffledPlayers.size() % 2 == 1) {
      let byePlayer = shuffledPlayers[shuffledPlayers.size() - 1];

      let byeMatchId = "m-bye-" # tournamentId # "-" # roundNumber.toText() # "-" # Time.now().toText();
      let byeMatch : Match = {
        id = byeMatchId;
        tournamentId;
        roundNumber;
        player1Id = byePlayer.id;
        player2Id = byePlayer.id;
        player1Name = byePlayer.name;
        player2Name = byePlayer.name;
        winnerId = ?byePlayer.id;
        loserId = null;
        result = #completed;
        byePlayerId = ?byePlayer.id;
      };

      matchList := matchList.concat([byeMatch]);
      matches.add(byeMatchId, byeMatch);
    };

    let roundId = "r-" # tournamentId # "-" # roundNumber.toText() # "-" # Time.now().toText();
    let round : Round = {
      roundNumber;
      tournamentId;
      matches = matchList;
      completed = false;
    };

    rounds.add(roundId, round);

    round;
  };

  func shuffleWithGuarantee(playerList : [Player], prevOrder : [Text]) : [Player] {
    if (playerList.size() <= 1) {
      return playerList;
    };

    let prevOrderFull = prevOrder;

    var attempt = 0;
    while (attempt < 10) {
      let candidate = shufflePlayers(playerList);
      let candidateIds = candidate.map(func(p) { p.id });

      if (
        candidateIds.size() != prevOrderFull.size() or
        (candidateIds.size() == prevOrderFull.size() and not candidateIds.equal(
          prevOrderFull,
          func(a, b) { a == b },
        ))
      ) {
        return candidate;
      };

      attempt += 1;
    };

    playerList;
  };

  public shared ({ caller }) func createTournament(name : Text, eliminationCount : ?Nat) : async Tournament {
    let id = name.concat(Time.now().toText());
    let tournament : Tournament = {
      id;
      name;
      status = #registration;
      createdAt = Time.now();
      winner = null;
      eliminationCount = switch (eliminationCount) {
        case (null) { 2 };
        case (?count) { count };
      };
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
      eliminationCount = tournament.eliminationCount;
    };
    tournaments.add(tournamentId, updatedTournament);

    let shuffledPlayers = shufflePlayers(
      tournamentPlayers.filter(
        func(p) { not p.eliminated }
      )
    );
    ignore buildRound(tournamentId, 1, shuffledPlayers);
    updatedTournament;
  };

  public shared ({ caller }) func createNextRound(tournamentId : Text) : async Round {
    let tournamentRounds = rounds.values().toArray().filter(
      func(r) { r.tournamentId == tournamentId }
    );

    if (tournamentRounds.size() == 0) {
      Runtime.trap("No rounds found for this tournament");
    };

    let roundNumbers = tournamentRounds.map(
      func(r) { r.roundNumber }
    );
    let maxRound = roundNumbers.foldLeft(
      0,
      func(acc, num) { if (num > acc) { num } else { acc } },
    );

    let activePlayers = players.values().toArray().filter(
      func(p) { p.tournamentId == tournamentId and not p.eliminated }
    );
    if (activePlayers.size() <= 1) {
      Runtime.trap("Not enough players left to create a new round");
    };

    let shuffledPlayers = shufflePlayers(activePlayers);
    buildRound(tournamentId, maxRound + 1, shuffledPlayers);
  };

  public query ({ caller }) func getRoundsByTournament(tournamentId : Text) : async [Round] {
    rounds.values().toArray().filter(
      func(r) { r.tournamentId == tournamentId }
    );
  };

  public query ({ caller }) func getCurrentRound(tournamentId : Text) : async ?Round {
    let incompleteRounds = rounds.values().toArray().filter(
      func(r) { r.tournamentId == tournamentId and not r.completed }
    );
    if (incompleteRounds.size() > 0) {
      ?incompleteRounds[0];
    } else {
      null;
    };
  };

  public shared ({ caller }) func recordMatchResult(matchId : Text, winnerId : Text, loserId : Text) : async Match {
    let match = getMatchOrTrap(matchId);
    let tournament = getTournamentOrTrap(match.tournamentId);
    let eliminationCount = tournament.eliminationCount;

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
      let updatedLosses = if (id == loserId) {
        player.losses + 1;
      } else { player.losses };

      let isEliminated = if (id == loserId and updatedLosses >= eliminationCount) {
        true;
      } else { player.eliminated };

      let updatedStatus = if (id == loserId) {
        if (updatedLosses >= eliminationCount) {
          #eliminated;
        } else { #oneLoss };
      } else { player.status };

      let updatedPlayer : Player = {
        id = player.id;
        tournamentId = player.tournamentId;
        name = player.name;
        losses = updatedLosses;
        eliminated = isEliminated;
        status = updatedStatus;
      };
      players.add(id, updatedPlayer);
    };

    let allRoundMatches = matches.values().toArray().filter(
      func(m) { m.tournamentId == match.tournamentId and m.roundNumber == match.roundNumber }
    );

    for ((roundId, round) in rounds.entries()) {
      if (round.tournamentId == match.tournamentId and round.roundNumber == match.roundNumber) {
        let updatedMatches = Array.tabulate(
          round.matches.size(),
          func(i) {
            if (i < round.matches.size() and round.matches[i].id == matchId) {
              updatedMatch;
            } else if (i < round.matches.size()) {
              return round.matches[i];
            } else {
              match;
            };
          },
        );

        let isRoundCompleted = updatedMatches.foldLeft(
          true,
          func(acc, m) { acc and (m.result == #completed or m.byePlayerId != null) },
        );

        let updatedRound = {
          roundNumber = round.roundNumber;
          tournamentId = round.tournamentId;
          matches = updatedMatches;
          completed = isRoundCompleted;
        };

        rounds.add(roundId, updatedRound);
      };
    };

    updatedMatch;
  };

  public shared ({ caller }) func undoMatchResult(matchId : Text) : async Match {
    let match = getMatchOrTrap(matchId);

    switch (match.result) {
      case (#pending) { Runtime.trap("Cannot undo a match that is not completed") };
      case (#completed) { () };
    };

    switch (match.byePlayerId) {
      case (?_) {
        Runtime.trap("Cannot undo a match with a bye");
      };
      case (null) {
        let loser = getPlayerOrTrap(
          switch (match.loserId) {
            case (?id) { id };
            case (null) { Runtime.trap("Loser ID must be provided") };
          }
        );

        let updatedLosses = if (loser.losses > 0) {
          loser.losses - 1;
        } else { 0 };

        let updatedPlayer : Player = {
          id = loser.id;
          tournamentId = loser.tournamentId;
          name = loser.name;
          losses = updatedLosses;
          eliminated = false;
          status = if (updatedLosses == 0) { #active } else { #oneLoss };
        };
        players.add(loser.id, updatedPlayer);

        let resetMatch : Match = {
          id = match.id;
          tournamentId = match.tournamentId;
          roundNumber = match.roundNumber;
          player1Id = match.player1Id;
          player2Id = match.player2Id;
          player1Name = match.player1Name;
          player2Name = match.player2Name;
          winnerId = null;
          loserId = null;
          result = #pending;
          byePlayerId = null;
        };
        matches.add(matchId, resetMatch);

        for ((roundId, round) in rounds.entries()) {
          if (round.tournamentId == match.tournamentId and round.roundNumber == match.roundNumber) {
            let updatedMatches = Array.tabulate(
              round.matches.size(),
              func(i) {
                if (i < round.matches.size() and round.matches[i].id == matchId) {
                  resetMatch;
                } else if (i < round.matches.size()) { round.matches[i] } else {
                  match;
                };
              },
            );

            let updatedRound = {
              roundNumber = round.roundNumber;
              tournamentId = round.tournamentId;
              matches = updatedMatches;
              completed = false;
            };

            rounds.add(roundId, updatedRound);
          };
        };

        resetMatch;
      };
    };
  };

  public shared ({ caller }) func completeTournament(tournamentId : Text, winner : Text) : async Tournament {
    let tournament = getTournamentOrTrap(tournamentId);
    let updatedTournament : Tournament = {
      id = tournament.id;
      name = tournament.name;
      status = #completed;
      createdAt = tournament.createdAt;
      winner = ?winner;
      eliminationCount = tournament.eliminationCount;
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
      eliminationCount = tournament.eliminationCount;
    };
    tournaments.add(tournamentId, updatedTournament);
    updatedTournament;
  };

  public shared ({ caller }) func deleteTournament(tournamentId : Text) : async () {
    if (not tournaments.containsKey(tournamentId)) {
      Runtime.trap("Tournament does not exist");
    };
    tournaments.remove(tournamentId);
  };

  public shared ({ caller }) func deletePlayer(playerId : Text) : async () {
    let player = getPlayerOrTrap(playerId);
    let updatedPlayer : Player = {
      id = player.id;
      tournamentId = player.tournamentId;
      name = player.name;
      losses = player.losses;
      eliminated = true;
      status = #eliminated;
    };
    players.add(playerId, updatedPlayer);
    for ((matchId, match) in matches.entries()) {
      if (match.result == #pending and match.byePlayerId == null) {
        if (match.player1Id == playerId or match.player2Id == playerId) {
          let winnerId = if (match.player1Id == playerId) { match.player2Id } else { match.player1Id };
          let updatedMatch : Match = {
            id = match.id;
            tournamentId = match.tournamentId;
            roundNumber = match.roundNumber;
            player1Id = match.player1Id;
            player2Id = match.player2Id;
            player1Name = match.player1Name;
            player2Name = match.player2Name;
            winnerId = ?winnerId;
            loserId = ?playerId;
            result = #completed;
            byePlayerId = null;
          };
          matches.add(matchId, updatedMatch);
          for ((roundId, round) in rounds.entries()) {
            if (round.tournamentId == match.tournamentId and round.roundNumber == match.roundNumber) {
              let updatedMatches = Array.tabulate(
                round.matches.size(),
                func(i) {
                  if (i < round.matches.size() and round.matches[i].id == matchId) {
                    updatedMatch;
                  } else if (i < round.matches.size()) { round.matches[i] } else { match };
                },
              );
              let isRoundCompleted = updatedMatches.foldLeft(
                true,
                func(acc, m) { acc and (m.result == #completed or m.byePlayerId != null) },
              );
              rounds.add(roundId, {
                roundNumber = round.roundNumber;
                tournamentId = round.tournamentId;
                matches = updatedMatches;
                completed = isRoundCompleted;
              });
            };
          };
        };
      };
    };
  };


  public shared ({ caller }) func reshuffleCurrentRound(tournamentId : Text) : async Round {
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { Runtime.trap("Tournament does not exist") };
      case (?t) { t };
    };

    if (tournament.status != #active) {
      Runtime.trap("Tournament must be active to reshuffle rounds");
    };

    var currentRoundOpt : ?Round = null;
    var currentRoundId : Text = "";
    for ((roundId, round) in rounds.entries()) {
      if (round.tournamentId == tournamentId and not round.completed) {
        currentRoundOpt := ?round;
        currentRoundId := roundId;
        let hasCompletedMatches = round.matches.foldLeft(
          false,
          func(acc, match) {
            acc or (match.result == #completed and match.byePlayerId == null)
          },
        );
        if (hasCompletedMatches) {
          Runtime.trap("Cannot reshuffle round with completed matches");
        };

        let previousPlayerOrder = round.matches.map(
          func(m) {
            if (m.byePlayerId == null) { m.player1Id } else { "" };
          }
        );

        for (match in round.matches.values()) {
          matches.remove(match.id);
        };

        rounds.remove(roundId);

        let activePlayers = players.values().toArray().filter(
          func(p) { p.tournamentId == tournamentId and p.status != #eliminated }
        );

        if (activePlayers.size() < 2) {
          Runtime.trap("Not enough players to create a round");
        };

        let shuffledPlayers = shuffleWithGuarantee(activePlayers, previousPlayerOrder);
        return buildRound(
          tournamentId,
          round.roundNumber,
          shuffledPlayers,
        );
      };
    };

    switch (currentRoundOpt) {
      case (null) { Runtime.trap("No incomplete rounds found for this tournament") };
      case (?_) { Runtime.trap("Unexpected error") };
    };
  };

  stable var tournaments : Map.Map<Text, Tournament> = Map.empty<Text, Tournament>();
  stable var players : Map.Map<Text, Player> = Map.empty<Text, Player>();
  stable var rounds : Map.Map<Text, Round> = Map.empty<Text, Round>();
  stable var matches : Map.Map<Text, Match> = Map.empty<Text, Match>();
};
