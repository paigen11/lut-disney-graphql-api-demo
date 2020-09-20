const { ApolloServer, gql } = require('apollo-server');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// define the type definitions in a schema
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
`;

// dummy data
const movies = [
  {
    id: 'naeeurehnin',
    title: 'Aladdin',
    releaseDate: new Date('11-25-1992'),
    rating: 4,
    actor: [
      {
        id: 'buiyvarrk',
        name: 'Robin Williams',
      },
    ],
  },
  {
    id: 'vnyhiorvn',
    title: 'The Little Mermaid',
    releaseDate: new Date('11-17-1989'),
    rating: 3,
  },
];

const resolvers = {
  // if it exists in your schema, it needs to exist here
  Query: {
    movies: () => {
      return movies;
    },
    movie: (obj, { id }, context, info) => {
      console.log(`id ${id}`);
      const foundMovie = movies.find((movie) => {
        return movie.id === id;
      });
      return foundMovie;
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
      // value sent to the client
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
});

// listen method launches a web server
server
  .listen({
    port: process.env.PORT || 4000,
  })
  .then(({ url }) => {
    console.log(`Server started at ${url}`);
  });
