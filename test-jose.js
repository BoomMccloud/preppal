import { SignJWT } from "jose";

async function test() {
  try {
    const secret = "test-secret-key-minimum-32-chars-long!!";
    const encoder = new TextEncoder();
    const encoded = encoder.encode(secret);
    const secretKey = new Uint8Array(encoded);

    const payload = {
      userId: "test-user",
      interviewId: "test-interview",
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secretKey);

    console.log("JWT created successfully:", jwt);
  } catch (error) {
    console.error("Error creating JWT:", error);
  }
}

test();
