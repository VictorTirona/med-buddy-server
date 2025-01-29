const express = require('express')
const { Pool } = require('pg')
const app = express();
const PORT = 5000;
require('dotenv').config();

app.use(express.json());
/*
QUERIES FOR SETUP:

CREATE TABLE medical_records (
  id			SERIAL PRIMARY KEY,
  symptoms		jsonb NOT NULL,
  start_date			VARCHAR(255) NOT NULL,
  end_date			VARCHAR(255) NULL,
  other_notes	TEXT NULL,
  diagnosis		jsonb NULL,
  medicine		jsonb NULL
);

INSERT INTO medical_records(symptoms, start_date, end_date, other_notes, diagnosis, medicine)
VALUES ('[{ "value": "fever", "label": "Fever" }, { "value": "greenphlegm", "label": "Green Phlegm" }, { "value": "cough", "label": "Cough" }]', '2025-01-27', '2025-01-30', 'Started as a cough with green phlegm. After my doctor gave me antibiotics, it became a dry cough. After another round of antibiotics, I was just on cough drops.', '[{ "value": "covid", "label": "COVID" }, { "value": "bronchitis", "label": "Bronchitis" }, { "value": "flu", "label": "Flu" }]', '[{ "value": "coamoxiclav", "label": "Coamoxiclav" }, { "value": "flemisten", "label": "Flemisten" }, { "value": "biodgesic", "label": "Biodgesic" }]');

*/


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tor_projects',
    password: `${process.env.POSTGRES_KEY}`,
    port: 5432,
})

app.get('/api/v1', (req, res) => {
    res.json({ message: "Welcome to Tor's Registration API" })
})

app.post('/api/v1', (req, res) => {
    console.log(req.body)
    res.json(req.body)
})

app.get('/api/v1/records', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM medical_records ORDER BY start_date DESC LIMIT 5;`
        );

        function getDate(dateString) {
            //converts date string to month year format
            const date = new Date(dateString);
            const options = { month: "short", year: "numeric" };
            const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);
            return formattedDate.toUpperCase();
        }

        function getLabels(inputObjectArray) {
            const readableObjectArray = inputObjectArray.map((perObject) => {
                return perObject.label;
            })
            return readableObjectArray;
        }

        function readableArray(inputArray) {
            const formattedText = inputArray.length > 1
                ? inputArray.slice(0, -1).join(", ") + ", and " + inputArray.slice(-1)
                : inputArray[0] || "";

            return formattedText;
        }

        const resultMapped = result.rows.map((perRecord) => {
            return ({
                ...perRecord,
                start_date: getDate(perRecord.start_date),
                end_date: (perRecord.end_date!=="") && getDate(perRecord.end_date),
                symptoms: readableArray(getLabels(perRecord.symptoms)),
                diagnosis: readableArray(getLabels(perRecord.diagnosis)),
                medicine: getLabels(perRecord.medicine),
            })
        })//insert MAP here to process jsonb data into something readable by the frontend
        res.json(resultMapped);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
    //
});

app.post('/api/v1/records', async (req, res) => {
    const { symptoms, start_date, end_date, other_notes, diagnosis, medicine } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO medical_records(symptoms, start_date, end_date, other_notes, diagnosis, medicine)
            VALUES (
                '${JSON.stringify(symptoms)}',
                '${start_date}',
                '${end_date}',
                '${other_notes}',
                '${JSON.stringify(diagnosis)}',
                '${JSON.stringify(medicine)}' 
            );`
        );
        res.json({ status: true });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
    //
});

app.delete('/api/v1/records', async (req, res) => {
    const { id } = req.body;
    try {
        const result = await pool.query(
            `DELETE FROM medical_records WHERE id=${id};`
        );
        res.json("Delete successful");

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
    //
});

app.put('/api/v1/records', async (req, res) => {
    const { id, symptoms, start_date, end_date, other_notes, diagnosis, medicine } = req.body;
    try {
        const result = await pool.query(
            `UPDATE medical_records 
            SET symptoms = '${JSON.stringify(symptoms)}',
                start_date = '${start_date}',
                end_date = '${end_date}',
                other_notes = '${other_notes}',
                diagnosis = '${JSON.stringify(diagnosis)}',
                medicine = '${JSON.stringify(medicine)}' 
            WHERE id=${id};`
        )
        res.json("Update successful");

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
    //
});

app.get('/api/v1/records/metrics/:year', async (req, res) => {
    const currentYear = req.params.year;
    
    try {
        const result = await pool.query(
            `SELECT 
            (
                SELECT COUNT(start_year)
                FROM (
                    SELECT SUBSTRING(start_date FROM 1 FOR 4) AS start_year 
                    FROM medical_records
                ) AS subquery
                WHERE start_year = '${currentYear}'
            ) AS count_illness,
            (
                SELECT sum(days) 
                FROM(
                    SELECT (end_date::date - start_date::date) AS days, 
                    SUBSTRING(start_date FROM 1 FOR 4) AS start_year 
                    FROM medical_records 
                    WHERE end_date IS NOT NULL
                    AND end_date != '') AS subquery
                WHERE start_year = '${currentYear}'
            ) AS days_sick`
        );

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
})

/*
Gets sick days and count of illnesses
SELECT 
(
	SELECT COUNT(start_year)
	FROM (
		SELECT SUBSTRING(start_date FROM 1 FOR 4) AS start_year 
		FROM medical_records
	) AS subquery
	WHERE start_year = '2025'
) AS count_illness,
(
	SELECT sum(days) 
	FROM(
		SELECT (end_date::date - start_date::date) AS days 
		FROM medical_records 
		WHERE end_date IS NOT NULL) AS subquery
) AS days_sick
//


app.post('/api/v1/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE email='${email}' AND password='${password}';`
        );
        if (result.rows.length === 0) {
            res.json(false);
        } else {
            res.json(true);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
});*/

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})