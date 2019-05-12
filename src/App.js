/* globals hljs */
import _ from 'lodash'
import cx from 'classnames'
import React from 'react';
import './App.css';

const F = () => {}

class Table {
	// For simplicity assumes no 2 column names are same
  constructor({ columns, primaryKey, rows = [] }) {
  	this.columns = columns // ['column_name', 'column_name', ...]
		this.rows = rows // { column: value, ... }
		this.primaryKey = primaryKey // Used as the identity of the row. Assumed unique
	}

	crossJoin({ table }) {
		const joinTable = new Table({ columns: this.columns.concat(table.columns) })

		this.rows.forEach((tableARow) => {
			table.rows.forEach((tableBRow) => {
				joinTable.rows.push({ ...tableARow, ...tableBRow })
			})
		})

		return joinTable
	}

	innerJoin({ table, onCondition }) {
		const joinTable = new Table({ columns: this.columns.concat(table.columns) })

		this.rows.forEach((tableARow) => {
			table.rows.forEach((tableBRow) => {
				if (onCondition(tableARow, tableBRow)) {
        	joinTable.rows.push({ ...tableARow, ...tableBRow })
				}
			})
		})

		return joinTable
	}

	leftOuterJoin({ table, onCondition }) {
		const rightTable = table
		const joinTable = this.innerJoin({ table: rightTable, onCondition })
		this.rows.forEach((leftTableRow) => {
			const isRowInJoin = !!joinTable.rows.find(
				(joinRow) => joinRow[this.primaryKey] === leftTableRow[this.primaryKey]
			)

			if (!isRowInJoin) {
				joinTable.rows.push({
        	...leftTableRow,
					...rightTable.createNullRow()
				})
			}
		})

		joinTable.rows = _.orderBy(joinTable.rows, (row) => row[this.primaryKey], 'asc')
		return joinTable
	}

	rightOuterJoin({ table, onCondition }) {
		const rightTable = table
		const joinTable = this.innerJoin({ table: rightTable, onCondition })
		rightTable.rows.forEach((rightTableRow) => {
			const isRowInJoin = !!joinTable.rows.find(
				(joinRow) => joinRow[rightTable.primaryKey] === rightTableRow[rightTable.primaryKey]
			)

			if (!isRowInJoin) {
				joinTable.rows.push({
        	...rightTableRow,
					...this.createNullRow()
				})
			}
		})

		joinTable.rows = _.orderBy(joinTable.rows, (row) => row[rightTable.primaryKey], 'asc')
		return joinTable
	}

	createNullRow() {
		return this.columns.reduce((row, column) => {
			row[column] = null
    	return row
		}, {})
	}

	rowsAsMatrix() {
  	return this.rows.map((row) => {
			return this.columns.map((header) => {
      	return row[header]
			})
		})
	}
}

const Panel = ({ content, text, width, contentHeight }) => {
  return (
		<div className="panel flex flex-column" style={{ width }}>
			<div
				className="content inner-container flex items-center justify-center"
				style={{ height: contentHeight }}>
				{content}
			</div>
			<div className={cx("text f5 inner-container", { 'has-text': !!text })}>
				{text}
			</div>
		</div>
	)
}

class Code extends React.Component {
	componentDidMount() {
		hljs.highlightBlock(this._el)
	}

	render() {
  	return (
			<code
				className={cx("sql code-block", this.props.className)}
				ref={(el) => this._el = el}>
				{this.props.children}
			</code>
		)
	}
}

const TableUi = ({ className = null, headers = [], rows = [], columnClass = null, getRowClass = F }) => {
	return (
		<table className={className}>
			<thead>
				<tr>
					{headers.map((header) => <th className={columnClass}>{header}</th>)}
				</tr>
			</thead>
			<tbody>
				{
					rows.map((row, ind) => (
						<tr className={getRowClass(row, ind, rows)}>{row.map((item) => <td className={columnClass}>{item || 'NULL'}</td>)}</tr>
					))
				}
			</tbody>
		</table>
	)
}

const Arrow = ({ className }) => <i className={"fas fa-arrow-right " + className}/>

const StartingTablePanel = ({ ownersTable, dogsTable }) => {
	return (
		<div className="">
			<OwnersTableUi
				className="mb4"
				ownersTable={ownersTable}
			/>
			<DogsTableUi
				dogsTable={dogsTable}
			/>
		</div>
	)
}

const CrossJoinSteps = ({ ownersTable, dogsTable }) => {
	const CONTENT_HEIGHT = 620
	const crossJoinTable = ownersTable.crossJoin({
		table: dogsTable
	})

	return (
		<div className="flex cross-join-steps justify-between-ns flex-wrap justify-center">
			<Panel
				width={280}
				contentHeight={CONTENT_HEIGHT}
				content={
					<StartingTablePanel
						ownersTable={ownersTable}
						dogsTable={dogsTable}
					/>
				}
				text="First you take the owners and the dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				width={380}
				contentHeight={CONTENT_HEIGHT}
				content={
					<div>
					{
						ownersTable.rowsAsMatrix().map((ownerRow, ind) => {
							return (
								<div className="flex justify-between mb3">
									<TableUi
										columnClass="owner-column"
										headers={(ind === 0) ? ownersTable.columns : []}
										rows={[ownerRow]}
									/>
									<div className="operator">+</div>
									<TableUi
										columnClass="dog-column"
										headers={(ind === 0) ? dogsTable.columns : []}
										rows={dogsTable.rowsAsMatrix()}
									/>
								</div>
							)
						})
					}
					</div>
				}
				text="Then take each row in the owners table and combine it with each row in the dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={280}
				content={
					<TableUi
						columnClass="owner-column"
						headers={crossJoinTable.columns}
						rows={crossJoinTable.rowsAsMatrix()}
					/>
				}
				text="Finally, you get a table with all of the columns from the dogs and owners table."
			/>
		</div>
	)
}

const InnerJoinSteps = ({ ownersTable, dogsTable }) => {
	const CONTENT_HEIGHT = 570

	const crossJoinTable = ownersTable.crossJoin({
		table: dogsTable
	})

	const innerJoinTable = ownersTable.innerJoin({
		table: dogsTable,
		onCondition: ((ownersTable, dogsTable) => {
			return ownersTable.id === dogsTable.owner_id
		})
	})

	return (
		<div className="flex cross-join-steps justify-between-ns flex-wrap justify-center">
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={300}
				content={
					<StartingTablePanel
						ownersTable={ownersTable}
						dogsTable={dogsTable}
					/>
				}
				text="First you take the owners and the dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={200}
				content={
					<TableUi
						columnClass="owner-column"
						headers={crossJoinTable.columns}
						rows={crossJoinTable.rowsAsMatrix()}
					/>
				}
				text={
					<span>
						Then you take the cross join of the tables.
					</span>
				}
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={200}
				content={
					<TableUi
						columnClass="owner-column"
						headers={crossJoinTable.columns}
						rows={crossJoinTable.rowsAsMatrix()}
						getRowClass={(row, ind, rows) => {
              const isRemoved = row[0] !== row[3]
							const nextRow = rows[ind + 1]
							if (isRemoved && nextRow && (nextRow[0] === nextRow[3])) {
								return 'removed next-present'
							} else if (isRemoved) {
								return 'removed'
							}
						}}
					/>
				}
				text={
					<span>
						Then you filter out the rows that do not satisfy the on condition.
					</span>
				}
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={180}
				content={
					<TableUi
						columnClass="owner-column"
						headers={innerJoinTable.columns}
						rows={innerJoinTable.rowsAsMatrix()}
					/>
				}
				text={
					<span>
						Finally you get a filtered table with all of the columns from the dogs and the owners table.
					</span>
				}
			/>
		</div>
	)
}

const LeftOuterJoinSteps = ({ ownersTable, dogsTable }) => {
	const CONTENT_HEIGHT = 420
	const innerJoinTable = ownersTable.innerJoin({
		table: dogsTable,
		onCondition: ({ id }, { owner_id }) => id === owner_id
	})

	const leftJoinTable = ownersTable.leftOuterJoin({
		table: dogsTable,
		onCondition: ({ id }, { owner_id }) => id === owner_id
	})

	return (
		<div className="flex cross-join-steps justify-between-ns flex-wrap justify-center">
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={300}
				content={
					<StartingTablePanel
						ownersTable={ownersTable}
						dogsTable={dogsTable}
					/>
				}
				text="First you take the owners and the dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={300}
				content={
					<TableUi
						columnClass="owner-column"
						headers={innerJoinTable.columns}
						rows={innerJoinTable.rowsAsMatrix()}
					/>
				}
				text={
					<span>
						Then you take inner join of the tables.
					</span>
				}
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow />
			</div>
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={400}
				content={
					<TableUi
						columnClass="owner-column"
						headers={leftJoinTable.columns}
						rows={leftJoinTable.rowsAsMatrix()}
						getRowClass={(row) => {
							return row[3] ? '' : 'added'
						}}
					/>
				}
				text={
					<span>
						Finally, add in any missing rows from the left table.
						The left table is the table named in the from part of the query.
						For the added rows the right table columns will be null.
					</span>
				}
			/>
		</div>
	)
}

const RightOuterJoinSteps = ({ ownersTable, dogsTable }) => {
	const CONTENT_HEIGHT = 420

	const innerJoinTable = ownersTable.innerJoin({
		table: dogsTable,
		onCondition: ({ id }, { owner_id }) => id === owner_id
	})

	const rightJoinTable = ownersTable.rightOuterJoin({
		table: dogsTable,
		onCondition: ({ id }, { owner_id }) => id === owner_id
	})

	return (
		<div className="flex cross-join-steps justify-between-ns flex-wrap justify-center">
			<Panel
				contentHeight={CONTENT_HEIGHT}
				width={300}
				content={
					<StartingTablePanel
						ownersTable={ownersTable}
						dogsTable={dogsTable}
					/>
				}
				text="First you take the owners and the dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				width={300}
				contentHeight={CONTENT_HEIGHT}
				content={
					<TableUi
						columnClass="owner-column"
						headers={innerJoinTable.columns}
						rows={innerJoinTable.rowsAsMatrix()}
					/>
				}
				text="Next, take inner join of the owners and dogs table."
			/>
			<div className="flex items-center dn-small arrow-col">
				<Arrow/>
			</div>
			<Panel
				width={400}
				contentHeight={CONTENT_HEIGHT}
				content={
					<TableUi
						columnClass="owner-column"
						headers={rightJoinTable.columns}
						rows={rightJoinTable.rowsAsMatrix()}
						getRowClass={(row) => {
							return row[0] ? '' : 'added'
						}}
					/>
				}
				text={
					<span>
						Finally, add in any missing rows from the right table.
						The right table is the table named following the OUTER JOIN part of the query.
						For the added rows the left table columns will be null.
					</span>
				}
			/>
		</div>
	)
}

const OwnersTableUi = ({ className, ownersTable }) => {
	return (
		<div className={className}>
			<label className="mv2 dib">Owners</label>
			<TableUi headers={ownersTable.columns} rows={ownersTable.rowsAsMatrix()} />
		</div>
	)
}

const DogsTableUi = ({ className, dogsTable }) => {
	return (
		<div className={className}>
			<label className="mv2 dib">Dogs</label>
			<TableUi headers={dogsTable.columns} rows={dogsTable.rowsAsMatrix()} />
		</div>
	)
}

class App extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			ownersTable: new Table({
				primaryKey: 'id',
      	columns: ['id', 'first_name'],
				rows: [
					{ id: 1, 'first_name': 'Brian' },
					{ id: 2, 'first_name': 'Sam' },
					{ id: 3, 'first_name': 'Alex' },
					{ id: 4, 'first_name': 'Kyle' },
				]
			}),
			dogsTable: new Table({
				primaryKey: 'name',
      	columns: ['name', 'owner_id'],
				rows: [
					{ name: 'Lu', 'owner_id': 1 },
					{ name: 'Marty', 'owner_id': 2 },
					{ name: 'Murphy', 'owner_id': 3 },
					{ name: 'Ringo', 'owner_id': 1 },
					{ name: 'Doggo', 'owner_id': 8 },
				]
			})
		}
	}

	render() {
		const {
			ownersTable, dogsTable
		} = this.state

		return (
			<div>
				<div className="mb4">
					<h1 className="tc mb2">Joins In Steps</h1>
					<h2 className="normal f5 tc silver mt0">7 May 2019 - <a className="silver" href="http://www.zindlerb.com/">Brian Zindler</a></h2>
				</div>
				<div className="flex justify-center mb5 flex-wrap">
					<div className="flex">
						<OwnersTableUi
							className="mr5"
							ownersTable={ownersTable}
						/>
						<DogsTableUi
							className="ml5 mr5-ns"
							dogsTable={dogsTable}
						/>
					</div>
					<div className="flex sidebar-text items-center f5 lh-copy ph0-ns ph3">
						<p>
							In the following examples, the SQL joins are broken down into the steps used to compute them.
							These steps are not what the database literally does, but they are useful for conceptually understanding joins.
							The examples will join the owners and dogs tables shown here.
							For a more traditional and complete breakdown of SQL joins I reccomend the <a href="https://en.wikipedia.org/wiki/Join_(SQL)">join wikipedia page</a>.
						</p>
					</div>
				</div>
				<div>
					<div className="mh3">
						<h2>Cross Join</h2>
						<Code className="mb2">
							SELECT *
							<br/>FROM owners
							<br/><b>CROSS</b> JOIN dogs;
						</Code>
						<CrossJoinSteps
							ownersTable={ownersTable}
							dogsTable={dogsTable}
						/>
					</div>
					<div className="mh3">
						<h2>Inner Join</h2>
						<Code className="mb2">
							SELECT *
							<br/>FROM owners
							<br/><b>INNER</b> JOIN dogs
							<br/><b>ON</b> owners.id = dogs.owner_id;
						</Code>
						<InnerJoinSteps
							ownersTable={ownersTable}
							dogsTable={dogsTable}
						/>
					</div>
					<div className="mh3">
						<h2>Left Outer Join</h2>
						<Code className="mb2">
							SELECT *
							<br/>FROM owners
							<br/><b>LEFT</b> OUTER JOIN dogs
							<br/><b>ON</b> owners.id = dogs.owner_id;
						</Code>
						<LeftOuterJoinSteps
							ownersTable={ownersTable}
							dogsTable={dogsTable}
						/>
					</div>
					<div className="mh3">
						<h2>Right Outer Join</h2>
						<Code className="mb2">
							SELECT *
							<br/>FROM owners
							<br/><b>RIGHT</b> OUTER JOIN dogs
							<br/><b>ON</b> owners.id = dogs.owner_id;
						</Code>
						<RightOuterJoinSteps
							ownersTable={ownersTable}
							dogsTable={dogsTable}
						/>
					</div>
				</div>
			</div>
		)
	}
}


export default App;
