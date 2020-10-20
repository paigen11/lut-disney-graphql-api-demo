const { ApolloServer, gql } = require('apollo-server');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(
  `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.abhkw.mongodb.net/database?retryWrites=true&w=majority`,
  { useNewUrlParser: true },
);
const db = mongoose.connection;

// declare a new mongoose schema using the docs to get started https://mongoosejs.com/docs/guide.html
const movieSchema = new mongoose.Schema({
  title: String,
  releaseDate: Date,
  rating: Number,
  status: String,
  actorIds: [String],
});

// attach movie schema to object here
const Movie = mongoose.model('Movie', movieSchema);

// define the type definitions in a schema - gql`` parses your string into an AST
const typeDefs = gql`
  # this cannot be defined in your schema, it must exist somewhere else
  # fragment Meta on Movie {
  #   releaseDate
  #   rating
  # }

  scalar Date

  # enums / constants - they can only be one of these values
  enum Status {
    WATCHED
    INTERESTED
    NOT_INTERESTED
    UNKNOWN
  }

  type Actor {
    id: ID!
    name: String!
  }

  # this is a schema defining a movie
  type Movie {
    id: ID! # special field to know when to update the cache (it's serialized as a string but it's special)
    title: String
    releaseDate: Date
    rating: Int
    actor: [Actor] # Valid = null, [], [...some data], X not valid [...some data without name or ID]
    # actor: [Actor]! # Valid = [], [...some data]
    # actor: [Actor!]! # Valid = [...some data]
    status: Status
    # fake: Float
    # fake2: Boolean
  }
  #  this is a query fetching an array of movies
  type Query {
    movies: [Movie]
    # define any params or arguments and their type ID
    movie(id: ID): Movie
  }

  input ActorInput {
    id: ID
  }

  # simplifies mutation args passed in
  input MovieInput {
    id: ID
    title: String
    releaseDate: Date
    rating: Int
    status: Status
    actor: [ActorInput] # you cannot have objects as sub fields inside an input, it must be another input type
  }

  # mutation to update data in graphql
  type Mutation {
    addMovie(movie: MovieInput): [Movie] # this is what gets returned from mutation
  }
`;

const actors = [
  {
    id: 'robin',
    name: 'Robin Williams',
  },
  {
    id: 'somebody',
    name: 'Hello world',
  },
];

// dummy data
const movies = [
  {
    id: 'naeeurehnin',
    title: 'Aladdin',
    releaseDate: new Date('11-25-1992'),
    rating: 4,
    actor: [
      {
        id: 'robin',
      },
    ],
  },
  {
    id: 'vnyhiorvn',
    title: 'The Little Mermaid',
    releaseDate: new Date('11-17-1989'),
    rating: 3,
    actor: [
      {
        id: 'somebody',
      },
    ],
  },
];

const resolvers = {
  // if it exists in your schema, it needs to exist here
  Query: {
    movies: async () => {
      try {
        const allMovies = await Movie.find();
        return allMovies;
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    movie: async (obj, { id }) => {
      try {
        const foundMovie = await Movie.findById(id);
        return foundMovie;
      } catch (err) {
        console.error(err);
        return {};
      }
    },
  },

  // technique to get info from another relational object associated with your current object
  Movie: {
    actor: (obj, arg, context) => {
      // DB call to filter actors out
      const actorIds = obj.actor.map((actor) => actor.id);
      const filteredActors = actors.filter((actor) => {
        return actorIds.includes(actor.id);
      });
      return filteredActors;
    },
  },

  Mutation: {
    addMovie: async (obj, { movie }, { userId }) => {
      try {
        if (userId) {
          // console.log(userId);
          // do mutation and database stuff
          // const newMoviesList = [
          //   ...movies,
          //   // new movie data goes here
          //   movie,
          // ];
          // mongo create
          await Movie.create({
            ...movie,
          });
          const allMovies = await Movie.find();
          // return data as expected in schema
          return allMovies;
        } else {
          return movies;
        }
      } catch (err) {
        console.error(err);
        return [];
      }
    },
  },

  Date: new GraphQLScalarType({
    name: 'Date',
    description: "it's a date, for realz",
    parseValue(value) {
      // valuue from the client
      return new Date(value);
    },
    serialize(value) {
      // value sent to the client (serialized in ms)
      return value.getTime();
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value);
      }
      return null;
    },
  }),
};

// create the apollo server = it needs typedefs and resolvers props
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  context: ({ req }) => {
    // objecct shared across all resolvers that are executing for a particular operation (use this to share per-operation state like auth info)
    const fakeUser = {
      userId: 'helloImaUser',
    };
    return { ...fakeUser };
  },
});

db.on('error', console.error.bind(console, 'connection error'));
db.on('open', () => {
  // we're connected!
  console.log('database connected');

  // listen method launches a web server
  server
    .listen({
      port: process.env.PORT || 4000,
    })
    .then(({ url }) => {
      console.log(`Server started at ${url}`);
    });
});
