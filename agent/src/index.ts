import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import {
  TwitterApi,
  type TTweetv2Expansion,
  type TTweetv2TweetField,
  type TTweetv2UserField,
  TweetV2,
  UserV2,
} from "twitter-api-v2";

dotenv.config();

// File to store tweet data
const TWEETS_FILE = path.join(__dirname, "../data/tweets.json");

// Create data directory if it doesn't exist
const dataDir = path.dirname(TWEETS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const TWITTER_USERNAME = process.env.TWITTER_USERNAME;
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Hardcoded Aptos token address to respond with
const APTOS_TOKEN_ADDRESS =
  "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// List of crypto personalities to tag
const CRYPTO_PERSONALITIES = [
  "@blknoiz06",
  "@cz_binance",
  "@CryptoJack",
  "@nayibbukele",
];

// Interface for storing tweet data
interface StoredTweetData {
  lastCheckedId: string | null;
  tweets: TweetV2[];
  users: UserV2[];
  lastUpdated: string;
}

// Interface for meme coin details
interface MemeCoinDetails {
  ticker: string;
  name: string;
  description: string;
}

// Default empty state
const emptyTweetData: StoredTweetData = {
  lastCheckedId: null,
  tweets: [],
  users: [],
  lastUpdated: new Date().toISOString(),
};

if (!TWITTER_USERNAME) {
  console.error(
    "Missing TWITTER_USERNAME environment variable. Please check your .env file."
  );
  process.exit(1);
}

if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
  console.error(
    "Missing TWITTER_API_KEY or TWITTER_API_SECRET environment variables. Please check your .env file."
  );
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error(
    "Missing OPENROUTER_API_KEY environment variable. Please check your .env file."
  );
  process.exit(1);
}

/**
 * Load stored tweet data from file or return default empty data
 */
function loadTweetData(): StoredTweetData {
  try {
    if (fs.existsSync(TWEETS_FILE)) {
      const data = fs.readFileSync(TWEETS_FILE, "utf8");
      const parsedData = JSON.parse(data) as StoredTweetData;
      console.log(
        `Loaded data with lastCheckedId: ${parsedData.lastCheckedId}`
      );
      console.log(`Last updated: ${parsedData.lastUpdated}`);
      console.log(`Stored ${parsedData.tweets.length} tweets`);
      return parsedData;
    }
  } catch (error) {
    console.error("Error loading tweet data:", error);
  }

  console.log("No saved tweet data found, starting fresh");
  return { ...emptyTweetData };
}

/**
 * Save tweet data to file
 */
function saveTweetData(data: StoredTweetData) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TWEETS_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log(
      `Saved ${data.tweets.length} tweets to file with lastCheckedId: ${data.lastCheckedId}`
    );
  } catch (error) {
    console.error("Error saving tweet data:", error);
  }
}

/**
 * Generates meme coin details based on tweet content using Gemini via OpenRouter
 */
async function generateMemeCoinFromTweet(
  tweetText: string
): Promise<MemeCoinDetails> {
  try {
    console.log(`Generating meme coin from tweet: ${tweetText}`);

    const prompt = `
      Create a meme cryptocurrency based on this tweet: "${tweetText}"
      
      Please generate:
      1. A creative ticker symbol (3-5 characters)
      2. A catchy name for the token
      3. A brief description explaining the token's concept
      
      Format your response as JSON with the following structure:
      {
        "ticker": "SYMBOL",
        "name": "Token Name",
        "description": "Brief description of the token concept"
      }
    `;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://mintara.xyz",
        },
        body: JSON.stringify({
          model: "google/gemini-1.5-flash",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log(`Generated meme coin data: ${content}`);

    // Parse the JSON response
    const coinDetails = JSON.parse(content) as MemeCoinDetails;

    // Validate and sanitize the response
    return {
      ticker: (coinDetails.ticker || "MEME").toUpperCase().slice(0, 5),
      name: coinDetails.name || "Meme Coin",
      description: coinDetails.description || "A new meme cryptocurrency",
    };
  } catch (error) {
    console.error("Error generating meme coin:", error);

    // Return fallback values if generation fails
    return {
      ticker: "MEME",
      name: "Default Meme Coin",
      description: "A cryptocurrency based on trending memes",
    };
  }
}

/**
 * Respond to a tweet with meme coin details
 */
async function respondToTweet(
  client: TwitterApi["readOnly"],
  tweetId: string,
  coinDetails: MemeCoinDetails
) {
  try {
    // Create a tweet client that can write
    const appOnlyClient = new TwitterApi(
      await getTwitterBearerToken(TWITTER_API_KEY!, TWITTER_API_SECRET!)
    );

    const tweetText = `🚀 Just created $${coinDetails.ticker} - ${
      coinDetails.name
    }!
    
${coinDetails.description}

Mint now on Aptos: ${APTOS_TOKEN_ADDRESS}

${CRYPTO_PERSONALITIES.join(" ")}`;

    console.log(`Preparing to tweet: ${tweetText}`);

    // Note: In a real implementation, you would use a user-authenticated client
    // We can't actually post tweets with an app-only client - this requires user auth
    console.log(`Would reply to tweet ${tweetId} with: ${tweetText}`);

    /*
    // Example of how this would work with a user-authenticated client:
    const response = await userAuthenticatedClient.v2.reply(
      tweetText,
      tweetId
    );
    console.log(`Posted reply: ${response.data.id}`);
    */
  } catch (error) {
    console.error("Error responding to tweet:", error);
  }
}

async function main() {
  try {
    // Get a bearer token from credentials
    const bearerToken = await getTwitterBearerToken(
      TWITTER_API_KEY!,
      TWITTER_API_SECRET!
    );

    // Initialize the Twitter client with the bearer token
    const twitterClient = new TwitterApi(bearerToken);
    const readOnlyClient = twitterClient.readOnly;

    console.log("Successfully authenticated with Twitter API");
    console.log(`Starting to monitor mentions for @${TWITTER_USERNAME}`);

    // Start listening for mentions
    await listenForMentions(readOnlyClient);
  } catch (error) {
    console.error("Error initializing Twitter client:", error);
    process.exit(1);
  }
}

/**
 * Gets a bearer token from Twitter API credentials
 */
async function getTwitterBearerToken(
  key: string,
  secret: string
): Promise<string> {
  try {
    const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
    const response = await fetch("https://api.twitter.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get bearer token: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting bearer token:", error);
    throw error;
  }
}

/**
 * Find a user by ID in an array of users
 */
function findUserById(users: UserV2[], userId: string): UserV2 | undefined {
  return users.find((user) => user.id === userId);
}

/**
 * Find a tweet by ID in an array of tweets
 */
function findTweetById(
  tweets: TweetV2[],
  tweetId: string
): TweetV2 | undefined {
  return tweets.find((tweet) => tweet.id === tweetId);
}

/**
 * Find users interested in a specific token using the Vector DB
 * Returns an array of user IDs
 */
async function findInterestedUsers(
  coinDetails: MemeCoinDetails
): Promise<string[]> {
  // This function is commented out as requested, but shows the implementation
  /*
  try {
    // Generate a query based on the coin details
    const query = `${coinDetails.name} ${coinDetails.description} ${coinDetails.ticker} cryptocurrency token`;
    
    // Call the vectordb API to find similar vectors
    const response = await fetch('http://localhost:3000/api/vectordb/query-similar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        topK: 5
      })
    });
    
    if (!response.ok) {
      throw new Error(`Vector DB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.similarVectors || [];
  } catch (error) {
    console.error("Error finding interested users:", error);
    return [];
  }
  */

  return [];
}

async function listenForMentions(client: TwitterApi["readOnly"]) {
  console.log(`Starting to listen for mentions of @${TWITTER_USERNAME}...`);

  // Load stored data from file
  const storedData = loadTweetData();

  // Set up an interval to check for mentions periodically
  let lastCheckedId: string | null = storedData.lastCheckedId;
  let isFirstRun = lastCheckedId === null;

  // Keep track of tweets and users to save
  let allTweets = [...storedData.tweets];
  let allUsers = [...storedData.users];

  // Define the check function with rate limit handling
  const checkMentions = async () => {
    try {
      // Search for mentions
      const searchQuery = `@${TWITTER_USERNAME}`;

      // Base search options
      const searchOptions = {
        "tweet.fields": [
          "created_at",
          "author_id",
          "text",
          "id",
          "conversation_id",
          "referenced_tweets",
          "in_reply_to_user_id",
        ] as TTweetv2TweetField[],
        "user.fields": ["username", "name"] as TTweetv2UserField[],
        expansions: [
          "author_id",
          "referenced_tweets.id",
          "referenced_tweets.id.author_id",
          "in_reply_to_user_id",
        ] as TTweetv2Expansion[],
        max_results: 10, // Reduced from 50 to minimize API usage
      };

      // Add since_id parameter if we have previously seen tweets
      if (!isFirstRun && lastCheckedId) {
        console.log(`Checking for mentions newer than ID: ${lastCheckedId}`);
        Object.assign(searchOptions, { since_id: lastCheckedId });
      } else {
        console.log("Checking for initial mentions...");
      }

      // Use a rate-limit aware function to make the API call
      const searchResponse = await makeRateLimitAwareRequest(() =>
        client.v2.search(searchQuery, searchOptions)
      );

      // If we have results
      const tweets = searchResponse.tweets;

      if (tweets.length > 0) {
        console.log(`Found ${tweets.length} mentions`);

        // Add users to our collection
        if (searchResponse.includes?.users) {
          for (const user of searchResponse.includes.users) {
            // Only add if not already in the array
            if (!findUserById(allUsers, user.id)) {
              allUsers.push(user);
            }
          }
        }

        // Add referenced tweets to our collection
        if (searchResponse.includes?.tweets) {
          for (const tweet of searchResponse.includes.tweets) {
            // Only add if not already in the array
            if (!findTweetById(allTweets, tweet.id)) {
              allTweets.push(tweet);
            }
          }
        }

        // Process tweets in reverse order (oldest first) for consistent display
        const tweetsToProcess = [...tweets].reverse();

        for (const tweet of tweetsToProcess) {
          // Add to our stored tweets if not already present
          if (!findTweetById(allTweets, tweet.id)) {
            allTweets.push(tweet);
          }

          // Find the author of this tweet
          const author = tweet.author_id
            ? findUserById(allUsers, tweet.author_id)
            : undefined;

          const username = author ? author.username : "unknown";

          // Process all tweets on first run, but remember the most recent ID
          if (isFirstRun) {
            console.log("Existing mention found:");
          } else {
            console.log("New mention detected:");
          }

          console.log(`From: @${username}`);
          console.log(`Mention Text: ${tweet.text}`);
          console.log(
            `Mention URL: https://twitter.com/${username}/status/${tweet.id}`
          );

          // Look for parent tweet
          let parentTweet: TweetV2 | undefined = undefined;
          let parentUsername = "unknown";

          // First check if we have referenced_tweets
          if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) {
            // Find the replied_to reference
            const replyRef = tweet.referenced_tweets.find(
              (ref) => ref.type === "replied_to"
            );

            if (replyRef && replyRef.id) {
              // Look for the parent tweet in our collection
              parentTweet = findTweetById(allTweets, replyRef.id);

              if (parentTweet) {
                // If we found the parent tweet, find its author
                if (parentTweet.author_id) {
                  const parentAuthor = findUserById(
                    allUsers,
                    parentTweet.author_id
                  );
                  if (parentAuthor) {
                    parentUsername = parentAuthor.username;
                  }
                }

                console.log("Parent Tweet Found:");
                console.log(`From: @${parentUsername}`);
                console.log(`Parent Text: ${parentTweet.text}`);
                console.log(
                  `Parent URL: https://twitter.com/${parentUsername}/status/${parentTweet.id}`
                );

                // Generate meme coin from parent tweet content
                const coinDetails = await generateMemeCoinFromTweet(
                  parentTweet.text
                );
                console.log("Generated Meme Coin:", coinDetails);

                // Find users who might be interested in this token
                /* 
                // This would call the vector DB API to find similar users
                const interestedUsers = await findInterestedUsers(coinDetails);
                console.log(`Found ${interestedUsers.length} potentially interested users`);
                */

                // Respond to the original tweet with the meme coin details
                await respondToTweet(client, tweet.id, coinDetails);
              } else {
                console.log(
                  "Parent tweet referenced but not included in response. ID:",
                  replyRef.id
                );

                // Try to fetch the parent tweet if not in our collection
                try {
                  const parentResponse = await makeRateLimitAwareRequest(() =>
                    client.v2.singleTweet(replyRef.id, {
                      "tweet.fields": ["author_id", "text", "id"],
                      "user.fields": ["username"],
                      expansions: ["author_id"],
                    })
                  );

                  if (parentResponse.data) {
                    parentTweet = parentResponse.data;
                    // Add to our tweets collection
                    allTweets.push(parentTweet);

                    // Add the author to our users collection if present
                    if (
                      parentResponse.includes?.users &&
                      parentResponse.includes.users.length > 0
                    ) {
                      const parentAuthor = parentResponse.includes.users[0];
                      if (!findUserById(allUsers, parentAuthor.id)) {
                        allUsers.push(parentAuthor);
                      }
                      parentUsername = parentAuthor.username;
                    }

                    console.log("Parent Tweet Fetched:");
                    console.log(`From: @${parentUsername}`);
                    console.log(`Parent Text: ${parentTweet.text}`);
                    console.log(
                      `Parent URL: https://twitter.com/${parentUsername}/status/${parentTweet.id}`
                    );

                    // Generate meme coin from parent tweet content
                    const coinDetails = await generateMemeCoinFromTweet(
                      parentTweet.text
                    );
                    console.log("Generated Meme Coin:", coinDetails);

                    // Find users who might be interested in this token
                    /*
                    // This would call the vector DB API to find similar users
                    const interestedUsers = await findInterestedUsers(coinDetails);
                    console.log(`Found ${interestedUsers.length} potentially interested users`);
                    */

                    // Respond to the original tweet with the meme coin details
                    await respondToTweet(client, tweet.id, coinDetails);
                  }
                } catch (fetchError) {
                  console.error("Error fetching parent tweet:", fetchError);
                }
              }
            }
          }

          if (!parentTweet) {
            console.log(
              "No parent tweet found - this is likely a direct mention, not a reply"
            );

            // If no parent tweet, use the mention itself to generate a meme coin
            const coinDetails = await generateMemeCoinFromTweet(tweet.text);
            console.log("Generated Meme Coin from mention:", coinDetails);

            // Find users who might be interested in this token
            /*
            // This would call the vector DB API to find similar users
            const interestedUsers = await findInterestedUsers(coinDetails);
            console.log(`Found ${interestedUsers.length} potentially interested users`);
            */

            // Respond to the mention with the meme coin details
            await respondToTweet(client, tweet.id, coinDetails);
          }

          console.log("---");
        }

        // Update the last checked ID with the newest tweet ID
        // Twitter returns tweets in reverse chronological order, so the first is the newest
        lastCheckedId = tweets[0].id;
        isFirstRun = false;

        // Save updated data to file - limit to most recent 1000 tweets to manage file size
        const tweetsToSave = allTweets.slice(-1000);
        const usersToSave = allUsers.slice(-1000); // Also limit users

        // Update our working arrays
        allTweets = tweetsToSave;
        allUsers = usersToSave;

        const dataToSave: StoredTweetData = {
          lastCheckedId,
          tweets: tweetsToSave,
          users: usersToSave,
          lastUpdated: new Date().toISOString(),
        };
        saveTweetData(dataToSave);
      } else {
        if (isFirstRun) {
          console.log("No existing mentions found.");
          isFirstRun = false;
        } else {
          console.log("No new mentions since last check.");
        }
      }
    } catch (error) {
      console.error("Error checking for mentions:", error);
    }
  };

  // Run immediately for first check
  await checkMentions();

  // Then set up interval
  setInterval(checkMentions, 60000); // Check every minute
}

/**
 * Makes a request that is aware of rate limits and will retry with backoff when hitting limits
 * @param requestFn Function that returns a Promise for the API request
 * @param maxRetries Maximum number of retries before giving up
 * @param initialDelay Initial delay in ms before retrying (will increase exponentially)
 */
async function makeRateLimitAwareRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 5000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await requestFn();
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error?.code === 429 || (error?.data && error?.data.status === 429)) {
        if (retries >= maxRetries) {
          console.error(
            `Rate limit exceeded after ${retries} retries. Giving up.`
          );
          throw error;
        }

        // Get reset time from headers if available
        let resetTime: number | undefined;
        if (error.rateLimit?.reset) {
          resetTime = error.rateLimit.reset;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        let waitTime: number;

        if (resetTime && resetTime > currentTime) {
          // If we have reset time, wait until that time (plus a small buffer)
          waitTime = (resetTime - currentTime) * 1000 + 1000;
          console.log(
            `Rate limit hit. Waiting for reset in ${waitTime / 1000} seconds.`
          );
        } else {
          // Otherwise use exponential backoff
          waitTime = delay;
          delay *= 2; // Exponential backoff
          console.log(
            `Rate limit hit. Retrying in ${waitTime / 1000} seconds.`
          );
        }

        retries++;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If it's not a rate limit error, rethrow
      throw error;
    }
  }
}

// Run the main function
main().catch(console.error);
