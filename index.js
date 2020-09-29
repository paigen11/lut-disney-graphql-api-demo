const { ApolloServer, gql } = require('apollo-server');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// define the type definitions in a schema - gql`` parses your string into an AST
const typeDefs = gql`
  scalar Date

  # enums / constants - they can only be one of these
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
    movies: () => {
      return movies;
    },
    movie: (obj, { id }, context, info) => {
      const foundMovie = movies.find((movie) => {
        return movie.id === id;
      });
      return foundMovie;
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
    addMovie: (obj, { movie }, { userId }) => {
      if (userId) {
        console.log(userId);
        // do mutation and database stuff
        const newMoviesList = [
          ...movies,
          // new movie data goes here
          movie,
        ];
        // return data as expected in schema
        return newMoviesList;
      } else {
        return movies;
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

// listen method launches a web server
server
  .listen({
    port: process.env.PORT || 4000,
  })
  .then(({ url }) => {
    console.log(`Server started at ${url}`);
  });
