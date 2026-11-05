#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const outputDir = path.resolve("out");
const firebasePath = path.resolve("firebase.json");

if (!fs.existsSync(outputDir)) {
    console.error("No existe la carpeta out/. Ejecutá primero next build.");
    process.exit(1);
}

const firebase = JSON.parse(fs.readFileSync(firebasePath, "utf8"));

const htmlFiles = [];

function buscarHTML(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            buscarHTML(fullPath);
        } else if (entry.name.endsWith(".html")) {
            htmlFiles.push(fullPath);
        }
    }
}

buscarHTML(outputDir);

const hashes = new Set();

for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");

    const scripts = html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
    );

    for (const match of scripts) {
        const attributes = match[1];
        const content = match[2];

        // Los scripts externos no necesitan hashes.
        if (/\bsrc\s*=/.test(attributes)) continue;

        if (!content.trim()) continue;

        const hash = crypto
            .createHash("sha256")
            .update(content, "utf8")
            .digest("base64");

        hashes.add(`'sha256-${hash}'`);
    }
}

const headers = firebase.hosting.headers;

for (const group of headers) {
    for (const header of group.headers ?? []) {
        if (header.key !== "Content-Security-Policy") continue;

        const parts = header.value.split(";").map((part) => part.trim());

        const scriptIndex = parts.findIndex((part) =>
            part.startsWith("script-src ")
        );

        if (scriptIndex === -1) {
            throw new Error("No se encontró la directiva script-src.");
        }

        const existing = parts[scriptIndex].split(/\s+/);

        const allHashes = new Set([
            ...existing,
            ...hashes,
        ]);

        parts[scriptIndex] = [...allHashes].join(" ");

        header.value = parts.join("; ");
    }
}

fs.writeFileSync(
    firebasePath,
    JSON.stringify(firebase, null, 2) + "\n"
);

console.log(`HTML analizados: ${htmlFiles.length}`);
console.log(`Hashes CSP encontrados: ${hashes.size}`);
console.log("firebase.json actualizado correctamente.");