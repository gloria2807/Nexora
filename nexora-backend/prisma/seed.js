import fetch from "node-fetch";

async function main() {
  console.log("Waiting for server...");

  // give Render a few seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const url =
    process.env.RENDER_EXTERNAL_URL + "/api/seed";

  console.log("Calling:", url);

  const response = await fetch(url, {
    method: "POST",
  });

  const data = await response.text();

  console.log(data);
}

main()
  .catch(console.error)
  .finally(() => process.exit());