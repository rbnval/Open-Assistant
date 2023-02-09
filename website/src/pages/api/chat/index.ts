import { post } from "src/lib/api";
import { withoutRole } from "src/lib/auth";

// TODO: move to env
export const INFERENCE_URL = "http://localhost:8000";

const handler = withoutRole("banned", async (req, res, token) => {
  const chat = await post(INFERENCE_URL + "/chat", { arg: {} });
  return res.status(200).json(chat);
});

export default handler;
