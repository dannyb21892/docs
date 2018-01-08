/**
 * A small script to manually ensure that no links have been broken.
 */

const args = require("yargs").argv;
const fs = require("fs");
const fetch = require("node-fetch");
const { spawn } = require("child_process");
const chalk = require("chalk").default;

if (args.generate) {
    generateLinksToCheck();
} else {
    checkLinks();
}

function checkUrlExists(urlToCheck) {
    return fetch(urlToCheck).then(res => res.ok || urlToCheck.includes("/404/"));
}

/**
 * Generate a list of the links we need to check.
 */
function generateLinksToCheck() {
    const process = spawn("yarn", ["run", "buildDev"], {});
    process.on("close", () => {
        const sitemap = fs.readFileSync("./public/sitemap.xml", "utf8");
        const links = sitemap.match(/<loc>.+<\/loc>/g);
        const cleanedLinks = links.map(link => {
            return link.replace("<loc>", "").replace("</loc>", "");
        });

        fs.writeFileSync("current-links.json", JSON.stringify(cleanedLinks), "utf8");

        console.log(`A list of existing site links has been generated in ${chalk.yellow("current-links.json")}.`);
        console.log(`Run ${chalk.yellow("yarn linkCheck")} in the future to test against these links.`);
    });
}

function checkLinks() {
    const links = JSON.parse(fs.readFileSync("./current-links.json", "utf8"));
    const badLinks = [];

    console.log("Starting docs dev server. Links checking will begin soon...\n");

    setTimeout(() => {
        console.log("Beginning link checking...");

        const promises = links.map(link => {
            return checkUrlExists(link).then(exists => {
                if (exists) {
                    console.log(chalk.green(link));
                } else {
                    badLinks.push(link);
                    console.log(chalk.red(link));
                }
            });
        });

        Promise.all(promises).then(() => {
            if (badLinks.length === 0) {
                console.log(chalk.green("All the links in the current-links.json were successfully validated."));
            } else {
                console.log(
                    badLinks.length +
                        chalk.red(
                            " bad links were found from the current-links.json. The following links were invalid:\n"
                        )
                );
                badLinks.forEach(link => {
                    console.log(link);
                });
            }
        });
    }, 8000);
}
