import React from 'react';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink, Container } from 'reactstrap';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar color="dark" dark expand="md">
        <NavbarBrand href="/">Alekos</NavbarBrand>
        <Nav className="me-auto" navbar>
          <NavItem>
            <NavLink href="/">Overview</NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/trading">Trading</NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/bot-trading">Bot Trading</NavLink>
          </NavItem>
        </Nav>
      </Navbar>
      <Container className="mt-4">{children}</Container>
    </div>
  );
};

export default Layout;
